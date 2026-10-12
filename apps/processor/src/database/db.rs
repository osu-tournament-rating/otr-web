use super::error::{DbError, DbResult};
use crate::model::structures::ruleset::Ruleset;
use futures::{pin_mut, TryStreamExt};
use std::sync::Arc;
use tokio::runtime::Handle;
use tokio_postgres::{types::ToSql, Client, NoTls, Row};
use tracing::{error, info};

/// The connection a rebuild runs on. Every write of a rebuild goes through
/// this one connection, inside the transaction from
/// [`DbClient::begin_transaction`].
#[derive(Clone)]
pub struct DbClient {
    pub(super) client: Arc<Client>
}

impl DbClient {
    pub async fn connect(connection_str: &str) -> DbResult<Self> {
        let (client, connection) = tokio_postgres::connect(connection_str, NoTls).await?;

        // The connection does the socket I/O and runs until the client is dropped.
        tokio::spawn(async move {
            if let Err(e) = connection.await {
                error!("connection error: {}", e);
            }
        });

        Ok(DbClient {
            client: Arc::new(client)
        })
    }

    /// The underlying client, for statements this type does not provide.
    pub fn client(&self) -> Arc<Client> {
        Arc::clone(&self.client)
    }

    /// Starts the rebuild's transaction. Repeatable read gives every statement
    /// in it the same snapshot, so the data cannot change partway through a run.
    pub async fn begin_transaction(&self) -> DbResult<DbTransactionGuard> {
        self.client
            .batch_execute("BEGIN ISOLATION LEVEL REPEATABLE READ")
            .await?;

        Ok(DbTransactionGuard {
            client: Some(Arc::clone(&self.client))
        })
    }

    /// Runs `query` and hands each row to `f` as it arrives, so a large result
    /// is never held in memory as raw rows.
    pub(super) async fn for_each_row(
        &self,
        query: &str,
        params: &[&(dyn ToSql + Sync)],
        mut f: impl FnMut(Row) -> DbResult<()>
    ) -> DbResult<()> {
        let rows = self.client.query_raw(query, params.iter().copied()).await?;
        pin_mut!(rows);

        while let Some(row) = rows.try_next().await? {
            f(row)?;
        }

        Ok(())
    }
}

/// Reads a row's `ruleset` column, failing on a value the processor does not
/// know. The error names the row by `entity` and its `id` column.
pub(super) fn ruleset_column(row: &Row, entity: &'static str) -> DbResult<Ruleset> {
    let ruleset: i32 = row.try_get("ruleset")?;

    match Ruleset::try_from(ruleset) {
        Ok(parsed) => Ok(parsed),
        Err(()) => Err(DbError::UnknownRuleset {
            entity,
            id: row.try_get("id")?,
            ruleset
        })
    }
}

/// An open transaction. Finish it with [`commit`](Self::commit) or
/// [`rollback`](Self::rollback); dropping it while open schedules a rollback.
pub struct DbTransactionGuard {
    /// Present while the transaction is open.
    client: Option<Arc<Client>>
}

impl DbTransactionGuard {
    pub async fn commit(mut self) -> DbResult<()> {
        self.finish("COMMIT").await
    }

    pub async fn rollback(mut self) -> DbResult<()> {
        self.finish("ROLLBACK").await
    }

    /// Ends the transaction with `statement`. It counts as ended even if the
    /// statement fails: a failed COMMIT has already rolled back, and a failed
    /// ROLLBACK means the connection is gone, which also rolls back.
    async fn finish(&mut self, statement: &str) -> DbResult<()> {
        if let Some(client) = self.client.take() {
            client.batch_execute(statement).await?;
        }

        Ok(())
    }
}

impl Drop for DbTransactionGuard {
    fn drop(&mut self) {
        let Some(client) = self.client.take() else {
            return;
        };

        if Handle::try_current().is_err() {
            error!("Runtime unavailable to rollback dangling transaction; transaction left pending");
            return;
        }

        tokio::spawn(async move {
            match client.batch_execute("ROLLBACK").await {
                Ok(()) => info!("ROLLBACK TRANSACTION (triggered in Drop)"),
                Err(e) => error!("Failed to rollback transaction during drop: {}", e)
            }
        });
    }
}

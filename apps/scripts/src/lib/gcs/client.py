from google.cloud import storage

from lib.config import config

storage_client = storage.Client.from_service_account_json(str(config.gcs_sa_json_path))

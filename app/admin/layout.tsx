import React from 'react';

export default function layout({
  children,
  modal,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}

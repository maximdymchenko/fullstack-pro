import * as React from 'react';
import { Error500 } from './500';
import {
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react";
import { Navigate } from "react-router-dom";

export function ErrorBoundary() {
  const error = useRouteError()
  const [hasAccountNotFoundError, setHasAccountNotFoundError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    console.trace(error);
    if (isRouteErrorResponse(error)) {
      const data = error?.data;
      if (data?.graphQLErrors?.length) {
        const graphqlError = data?.graphQLErrors[0];
        if (graphqlError.type === 'ACCOUNT_NOT_FOUND') {
          setHasAccountNotFoundError(true)
        }
      }
    }
    setIsLoading(false)
  }, [error]);


  if (!isLoading) {
    if (isRouteErrorResponse(error)) {
      return hasAccountNotFoundError ? <Navigate to="/verify-user" /> : (
        <Error500 title={error.statusText} status={error.status} data={error.data} />
      );
    } else if (error instanceof Error) {
      return (
        <Error500 title={error.message} status="500" data={error.stack} />
      );
    } else {
      return (
        <Error500 title="Unknown Error" status="500" data={error} />
      );
    }
  }
}

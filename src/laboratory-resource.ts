import { openmrsFetch, restBaseUrl, useConfig } from "@openmrs/esm-framework";
import { FulfillerStatus } from "./types";
import { Order } from "@openmrs/esm-patient-common-lib";
import useSWR from "swr";
import { useMemo } from "react";

/**
 * Custom hook for retrieving laboratory orders based on the specified status.
 *
 * @param status - The status of the orders to retrieve
 * @param excludeCanceled - Whether to exclude canceled, discontinued and expired orders
 */
export function useLabOrders(
  status: "NEW" | FulfillerStatus = null,
  excludeCanceled = true
) {
  const { laboratoryOrderTypeUuid } = useConfig();
  const fulfillerStatus = useMemo(
    () => (status === "NEW" ? null : status),
    [status]
  );
  const newOrdersOnly = status === "NEW";
  let url = `${restBaseUrl}/order?orderTypes=${laboratoryOrderTypeUuid}&v=full`;
  url = fulfillerStatus ? url + `&fulfillerStatus=${fulfillerStatus}` : url;
  url = excludeCanceled
    ? `${url}&excludeCanceledAndExpired=true&excludeDiscontinueOrders=true`
    : url;
  // The usage of SWR's mutator seems to only suffice for cases where we don't apply a status filter
  const refreshInterval = status ? 5000 : null;
  const { data, error, mutate, isLoading } = useSWR<{
    data: { results: Array<Order> };
  }>(url, openmrsFetch, { refreshInterval });

  const filteredOrders =
    data?.data &&
    newOrdersOnly &&
    data.data.results.filter(
      (order) => order?.action === "NEW" && order?.fulfillerStatus === null
    );
  return {
    labOrders: filteredOrders || data?.data.results || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function setFulfillerStatus(
  orderId: string,
  status: FulfillerStatus,
  abortController: AbortController
) {
  return openmrsFetch(`${restBaseUrl}/order/${orderId}/fulfillerdetails/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal: abortController.signal,
    body: { fulfillerStatus: status },
  });
}

export function rejectLabOrder(
  orderId: string,
  comment: string,
  abortController: AbortController
) {
  return openmrsFetch(`${restBaseUrl}/order/${orderId}/fulfillerdetails/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal: abortController.signal,
    body: {
      fulfillerStatus: "DECLINED",
      fulfillerComment: comment,
    },
  });
}

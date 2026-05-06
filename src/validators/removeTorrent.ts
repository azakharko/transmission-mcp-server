export function assertDeleteLocalDataConfirmed(
  deleteLocalData: boolean,
  confirmDeleteLocalData: boolean,
): void {
  if (deleteLocalData && !confirmDeleteLocalData) {
    throw new Error(
      "delete_local_data requires confirm_delete_local_data=true to delete downloaded data",
    );
  }
}

export const getExplorerBaseUrl = (chainId) => {
  switch (Number(chainId)) {
    case 1:
      return "https://etherscan.io";
    case 11155111:
      return "https://sepolia.etherscan.io";
    case 5:
      return "https://goerli.etherscan.io";
    default:
      return null;
  }
};

export const getTxUrl = (chainId, txHash) => {
  const baseUrl = getExplorerBaseUrl(chainId);
  if (!baseUrl || !txHash) return null;
  return `${baseUrl}/tx/${txHash}`;
};

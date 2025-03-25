async function getAztecAddress() {
  try {
    const { createPXEClient } = await import('@aztec/aztec.js');
    const pxe = createPXEClient('https://api.aztec.network:8080');
    const accounts = await pxe.getAccounts();

    if (!accounts || accounts.length === 0) {
      return 'No account found';
    }

    return accounts[0].toString();
  } catch (err) {
    console.error("❌ Failed to fetch from Aztec PXE:", err);
    return "Connection failed";
  }
}

module.exports = { getAztecAddress };

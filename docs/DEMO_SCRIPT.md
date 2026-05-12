# IkaPayFi — 2-Minute Demo Video Script

**Tips:** Keep it fast. Let the UI do the talking. Aim for ~90 seconds to 2 minutes.

---

### 1. The Hook (0:00 - 0:20)
**[Visual: Landing page hero section. Click 'Open App']**

**Speaker:**
"Global freelancers and DAOs need private, cross-chain payroll without the bridging hassle. 
Meet IkaPayFi. We use **Ika dWallets** for native cross-chain custody, and **Encrypt FHE** to keep your payment splits and policies completely hidden on-chain."

---

### 2. Private Policy Setup (0:20 - 0:40)
**[Visual: Connect wallet (WebAuthn). Go to Policy Vault. Adjust sliders.]**

**Speaker:**
"After a quick passkey login, we set up our routing policy. I'm allocating 25% to Savings and 20% to Family. 
These percentages aren't public. They are encrypted using Encrypt FHE, so the blockchain only ever sees ciphertext."

---

### 3. Batch Payroll & FHE (0:40 - 1:10)
**[Visual: Go to Payrolls. Click '+ New Batch'. Add 2 recipients and hit Submit.]**

**Speaker:**
"For DAOs, we built Batch Payroll. You add your team, hit submit, and watch.
**[Visual: Pause briefly on the FHE Encryption overlay]**
Our Solana program is now executing the `payfi_split_graph` entirely on encrypted data. No plaintext is ever exposed."

---

### 4. Bridgeless Approval (1:10 - 1:40)
**[Visual: Show the generated Payroll Cards. Click 'Approve & Sign'.]**

**Speaker:**
"Once the FHE execution finishes, the payroll cards appear.
When we hit 'Approve', the program verifies the encrypted spend limits. If it passes, it triggers an MPC signature from the Ika dWallet network. Funds are released natively on Ethereum or Bitcoin—zero bridging required."

---

### 5. Outro (1:40 - 1:50)
**[Visual: Briefly show the Audit Log with the ciphertexts.]**

**Speaker:**
"Bridgeless payments. Complete privacy. That's IkaPayFi. Check out our live Devnet deployment. Thank you!"

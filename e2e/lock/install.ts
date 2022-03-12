import { config } from "dotenv";
config({ path: ".env.lockunlock" });
import { LOCKClient } from "casper-lock-client";
import {  getDeploy, getAccountInfo, getAccountNamedKeyValue } from "../utils";
import * as fs from "fs";

import {
  Keys,
} from "casper-js-sdk";

const {
  NODE_ADDRESS,
  CHAIN_NAME,
  WASM_PATH,
  DEPLOYER_KEY_PAIR_PATH,
  INITIAL_AMOUNT,
  INSTALL_PAYMENT_AMOUNT,
} = process.env;

export const getBinary = (pathToBinary: string) => {
  return new Uint8Array(fs.readFileSync(pathToBinary, null).buffer);
};


const KEYS = Keys.Ed25519.parseKeyFiles(
  `${DEPLOYER_KEY_PAIR_PATH}/public_key.pem`,
  `${DEPLOYER_KEY_PAIR_PATH}/secret_key.pem`
);

const test = async () => {
  const lock = new LOCKClient(
    NODE_ADDRESS!,
    CHAIN_NAME!
  );

  const installDeployHash = await lock.install(
    getBinary(WASM_PATH!),
    {
      amount: INITIAL_AMOUNT!,
    
    },
    INSTALL_PAYMENT_AMOUNT!,
    KEYS.publicKey,
    [KEYS],
  );

  const hash = await installDeployHash.send(NODE_ADDRESS!);

  console.log(`... Contract installation deployHash: ${hash}`);

  await getDeploy(NODE_ADDRESS!, hash);

  console.log(`... Contract installed successfully.`);

  let accountInfo = await getAccountInfo(NODE_ADDRESS!, KEYS.publicKey);

  console.log(`... Account Info: `);
  console.log(JSON.stringify(accountInfo, null, 2));

  const contractHash = await getAccountNamedKeyValue(
    accountInfo,
    `lock_unlock_cspr_contract`
  );

  console.log(`... Contract Hash: ${contractHash}`);
};

test();


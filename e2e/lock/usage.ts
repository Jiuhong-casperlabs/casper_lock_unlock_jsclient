import { config } from "dotenv";
config({ path: ".env.lockunlock" });
import { LOCKClient, LOCKEvents, LOCKEventParser } from "casper-lock-client";
import {  sleep, getDeploy, getAccountInfo, getAccountNamedKeyValue } from "../utils";

import {
  Keys,
  EventStream,
  EventName,
} from "casper-js-sdk";

const {
  NODE_ADDRESS,
  EVENT_STREAM_ADDRESS,
  CHAIN_NAME,
  DEPLOYER_KEY_PAIR_PATH,
  LOCK_CSPR_PAYMENT_AMOUNT,
  UNLOCK_CSPR_PAYMENT_AMOUNT,
  BSC_RECIPIENT_ADDRESS,
  RECEIPIENT_STR,
  BSC_TRANSACTION_HASH,
  LOCK_AMOUNT,
  UNLOCK_AMOUNT,
} = process.env;

const KEYS = Keys.Ed25519.parseKeyFiles(
  `${DEPLOYER_KEY_PAIR_PATH}/public_key.pem`,
  `${DEPLOYER_KEY_PAIR_PATH}/secret_key.pem`
);


const test = async () => {
  const lock = new LOCKClient(
    NODE_ADDRESS!,
    CHAIN_NAME!
  );

  let accountInfo = await getAccountInfo(NODE_ADDRESS!, KEYS.publicKey);

  console.log(`... Account Info: `);
  console.log(JSON.stringify(accountInfo, null, 2));

  const contractHash = await getAccountNamedKeyValue(
    accountInfo,
    `lock_unlock_cspr_contract`
  );

  const contractPackageHash = await getAccountNamedKeyValue(
    accountInfo,
    `lock_unlock_cspr_package`
  );

  console.log(`... Contract Hash: ${contractHash}`);
  console.log(`... Contract Package Hash: ${contractPackageHash}`);

  await lock.setContractHash(contractHash, contractPackageHash);

  await sleep(5 * 1000);

  const es = new EventStream(EVENT_STREAM_ADDRESS!);

  es.subscribe(EventName.DeployProcessed, (event) => {
    const parsedEvents = LOCKEventParser({
      contractHash, 
      eventNames: [
        LOCKEvents.LockCSPR,
        LOCKEvents.UnLockCSPR

      ]
    }, event);

    if (parsedEvents && parsedEvents.success) {
      console.log("*** EVENT start***");
      console.log(JSON.stringify(parsedEvents.data));
      console.log("*** EVENT end***");
    }
      }
  );

  es.start();
  
  //****************//
  //* lock Section *//
  //****************//
  console.log('\n*************************\n');

  console.log('... Lock CSPR \n');

  const lockDeploy = await lock.lockCSPR(
    BSC_RECIPIENT_ADDRESS!,
    LOCK_AMOUNT!,
    LOCK_CSPR_PAYMENT_AMOUNT!,
    KEYS.publicKey,
    [KEYS]
  );

  const lockDeployHash = await lockDeploy.send(NODE_ADDRESS!);

  console.log("...... lock deploy hash: ", lockDeployHash);

  await getDeploy(NODE_ADDRESS!, lockDeployHash);
  console.log("...... lock successfully");

  console.log('\n*************************\n');

  //****************//
  //* unlock Section *//
  //****************//
  console.log('\n*************************\n');

  console.log('... unlock CSPR \n');

  console.log("UNLOCK_AMOUNT:", UNLOCK_AMOUNT);
  console.log("BSC_RECIPIENT_ADDRESS:", BSC_RECIPIENT_ADDRESS);

  const unlockDeploy = await lock.unLockCSPR(
    RECEIPIENT_STR!,
    BSC_TRANSACTION_HASH!,
    UNLOCK_AMOUNT!,
    UNLOCK_CSPR_PAYMENT_AMOUNT!,
    KEYS.publicKey,
    [KEYS]
  );

  const unlockDeployHash = await unlockDeploy.send(NODE_ADDRESS!);

  console.log("...... Unlock deploy hash: ", unlockDeployHash);

  await getDeploy(NODE_ADDRESS!, unlockDeployHash);
  console.log("...... Unlock successfully");
  console.log('\n*************************\n');

};


test();

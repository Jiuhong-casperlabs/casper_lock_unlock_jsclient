import {
  CLPublicKey,
  CLMap,
  RuntimeArgs,
  CasperClient,
  Contracts,
  Keys,
  CLValueBuilder,
  CLValueParsers 
} from "casper-js-sdk";

const { Contract, toCLMap, fromCLMap } = Contracts;

export interface LOCKInstallArgs {
  amount: string,
};

export enum LOCKEvents {
  LockCSPR = "lock_cspr",
  UnLockCSPR = "unlock_cspr",
}

export const LOCKEventParser = (
  {
    contractHash,
    eventNames,
  }: { contractHash: string; eventNames: LOCKEvents[] },
  value: any
) => {
  if (value.body.DeployProcessed.execution_result.Success) {
    const { deploy_hash } = value.body.DeployProcessed; 
    const { transforms } =
      value.body.DeployProcessed.execution_result.Success.effect;

        const LOCKEvents = transforms.reduce((acc: any, val: any) => {
          if (
            val.transform.hasOwnProperty("WriteCLValue") &&
            typeof val.transform.WriteCLValue.parsed === "object" &&
            val.transform.WriteCLValue.parsed !== null
          ) {
            const maybeCLValue = CLValueParsers.fromJSON(
              val.transform.WriteCLValue
            );
            const clValue = maybeCLValue.unwrap();
            if (clValue && clValue instanceof CLMap) {
              const hash = clValue.get(
                CLValueBuilder.string("lock_unlock_cspr_contract")
              );
              const event = clValue.get(CLValueBuilder.string("event_type"));
              if (
                hash &&
                // NOTE: Calling toLowerCase() because current JS-SDK doesn't support checksumed hashes and returns all lower case value
                // Remove it after updating SDK
                hash.value().slice(9) === contractHash.slice(5).toLowerCase() &&
                event &&
                eventNames.includes(event.value())
              ) {
                acc = [...acc, { name: event.value(), clValue }];
              }
            }
          }
          return acc;
        }, []);

    return { error: null, success: !!LOCKEvents.length, data: { deploy_hash, LOCKEvents } };
  }

  return null;
};

export class LOCKClient {
  casperClient: CasperClient;
  contractClient: Contracts.Contract;

  constructor(public nodeAddress: string, public networkName: string) {
    this.casperClient = new CasperClient(nodeAddress);
    this.contractClient = new Contract(this.casperClient);
  }

  public install(
    wasm: Uint8Array,
    args: LOCKInstallArgs,
    paymentAmount: string,
    deploySender: CLPublicKey,
    keys?: Keys.AsymmetricKey[]
  ) {
    const runtimeArgs = RuntimeArgs.fromMap({
      amount: CLValueBuilder.u512(args.amount),
    });

    return this.contractClient.install(wasm, runtimeArgs, paymentAmount, deploySender, this.networkName, keys || []);
  }

  public setContractHash(contractHash: string, contractPackageHash?: string) {
    this.contractClient.setContractHash(contractHash, contractPackageHash);
  }

  public async lockCSPR(
    bsc_recipient_address: string,
    amount: string,
    paymentAmount: string,
    deploySender: CLPublicKey,
    keys?: Keys.AsymmetricKey[]
  ) {
    const runtimeArgs = RuntimeArgs.fromMap({
      bsc_recipient_address: CLValueBuilder.string(bsc_recipient_address),
      amount: CLValueBuilder.u512(amount)
    });

    return this.contractClient.callEntrypoint(
      'lock_cspr',
      runtimeArgs,
      deploySender,
      this.networkName,
      paymentAmount,
      keys
    );
  }

  public async unLockCSPR(
    receipient_publickey: string,
    bsc_transaction_hash: string,
    amount: string,
    paymentAmount: string,
    deploySender: CLPublicKey,
    keys?: Keys.AsymmetricKey[]
  ) {
    const runtimeArgs = RuntimeArgs.fromMap({
      receipient_publickey: CLValueBuilder.string(receipient_publickey),
      bsc_transaction_hash: CLValueBuilder.string(bsc_transaction_hash),
      amount: CLValueBuilder.u512(amount)
    });

    return this.contractClient.callEntrypoint(
      'unlock_cspr',
      runtimeArgs,
      deploySender,
      this.networkName,
      paymentAmount,
      keys
    );
  }


}


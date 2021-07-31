import { BigInt, ByteArray, ethereum, json, JSONValueKind, Bytes, log } from "@graphprotocol/graph-ts"
import { poster, PostCall } from "../generated/poster/poster"
import { Transaction, Token, Account, Balance, AccountBalance } from "../generated/schema"

export function handlePost(call: PostCall): void {
    let id = call.transaction.hash.toHex();
    let transaction = new Transaction(id);

    log.info("Loading Token System", []);
    let account = Account.load(call.from.toHex());
    if (account == null) {
        account = new Account(call.from.toHex());
        account.nonce = BigInt.fromI32(0);
    }


    // Ideally here we call the contract to validate the user actually signed the message

    transaction.from = call.from.toHex();
    transaction.to = call.to.toHex();
    transaction.value = call.transaction.value;
    transaction.timestamp = call.block.timestamp;
    transaction.blockNumber = call.block.number;
    transaction.content = call.inputs.content

    transaction.save()

    let tryData = json.try_fromBytes(ByteArray.fromUTF8(call.inputs.content) as Bytes);



    if (tryData.isOk) {
        log.info("JSON found.", []);

        let json_dict = tryData.value.toObject();

        //Check if the "operation" flag exists
        let isOperationFlag = json_dict.get('operation');
        if (isOperationFlag == null) {
            return;
        }
        if (isOperationFlag.kind != JSONValueKind.STRING) {
            return;
        }

        // Check account nonce
        let nonce = json_dict.get('nonce');
        if (nonce != null && nonce.kind == JSONValueKind.NUMBER) {
            if (nonce.toBigInt() != account.nonce.plus(BigInt.fromI32(1))) {
                log.warning("Account nonce is incorrect {}", [nonce.toBigInt().toString()]);
                return;
            }

            account.nonce = account.nonce.plus(BigInt.fromI32(1));
        }

// Remember to reject if the nonce is not actually present
        if (nonce == null){
            log.warning("No nonce provided", []);
            return;
        }

        let operation = json_dict.get('operation');

        if (operation != null && operation.kind == JSONValueKind.STRING) {
            if (operation.toString() == "CREATE") {
                let tokenName = json_dict.get('name');
                let tokenSupply = json_dict.get('supply')
                let token: Token;

                if (tokenName != null && tokenName.kind == JSONValueKind.STRING) {
                    token = Token.load(tokenName.toString() as string) as Token;

                    if (token != null) {
                        log.warning("Token Name already in use", []);
                        return;
                    }

                    token = new Token(tokenName.toString());
                    token.creator = call.from.toHex();

                    if (tokenSupply != null && tokenSupply.kind == JSONValueKind.NUMBER) {
                        token.totalSupply = tokenSupply.toBigInt();

                        // give all tokens to account
                        let newBalance = new Balance(tokenName.toString().concat(account.id));
                        newBalance.account = account.id;
                        newBalance.token = token.id;
                        newBalance.amount = token.totalSupply;
                        newBalance.save();

                    }
                    token.save();
                }
                return;
            }

            if (operation.toString() == "TRANSFER") {
                let recipient = json_dict.get('recipient');
                let amount = json_dict.get('amount');
                let targetToken = json_dict.get('token')

                let validatedRecipient: Account;
                let validatedAmount: BigInt;
                let validatedToken: Token;


                if (recipient != null && recipient.kind == JSONValueKind.STRING) {

                    validatedRecipient = Account.load(recipient.toString() as string) as Account;
                    if (validatedRecipient == null) {
                        validatedRecipient = new Account(recipient.toString());
                        validatedRecipient.nonce = BigInt.fromI32(0);
                    }

                }

                validatedRecipient.save();

                if (amount != null && amount.kind == JSONValueKind.NUMBER) {
                    validatedAmount = amount.toBigInt();

                }

                if (targetToken != null && targetToken.kind == JSONValueKind.STRING) {
                    validatedToken = Token.load(targetToken.toString() as string) as Token;
                    if (validatedToken == null) {
                        log.warning("No such token exists. {}", [targetToken.toString()]);
                        return;
                    }
                }

                // Calculate new balances

                // Get sender balance
                let senderBalance = Balance.load(targetToken.toString().concat(account.id));
                if (senderBalance == null) {
                    log.warning("Account has no token balance.", []);
                    return
                }

                // subtract from sender
                senderBalance.amount = senderBalance.amount.minus(validatedAmount);

                // add to recipient
                let recipientBalance = Balance.load(targetToken.toString().concat(validatedRecipient.id));
                if (recipientBalance == null) {
                    recipientBalance = new Balance(targetToken.toString().concat(validatedRecipient.id));
                    recipientBalance.account = validatedRecipient.id;
                    recipientBalance.token = validatedToken.id;
                }
                recipientBalance.amount = recipientBalance.amount.plus(validatedAmount);

                senderBalance.save();
                recipientBalance.save();



            }
        }


    } else {
        log.info('Could not parse json for content: {}', [call.inputs.content]);
        return;
    }

    /** 
     *  Format for Data: 
     * 
     * {
     * operation: "CREATE",
     * supply: "big int"
     * name: "<<NAME>>"
     * }
     * 
     * {
     * operation: "TRANSFER",
     * token: "hex address"
     * recipient: "<address>",
     * amount: "uint"
     * }
     * 
     */

}
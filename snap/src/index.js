module.exports.onRpcRequest = async ({ origin, request }) => {
    switch (request.method) {
      case 'notify':
        return wallet.request({
          method: 'snap_notify',
          params: [
           {
              type: request.params.type,
              message: request.params.message,
            },
          ],
        });
      case 'confirm':
        return wallet.request({
          method: 'snap_confirm',
          params: [
            {
              prompt: request.params.promt,
              description: request.params.description,
              textAreaContent: request.params.textAreaContent,
            },
          ],
        });
       case 'entropy':
       return wallet.request({
          method: 'snap_getBip44Entropy',
          params: {
            coinType: 0,
          },
       });
  
      default:
        throw new Error('Method not found.');
    }
  };
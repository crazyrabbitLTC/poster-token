# poster-token
A test of using TheGraph for containerized blockchains

I'm bad at writing readme's

Get some background here: 
https://twitter.com/DennisonBertram/status/1421809775889817604?s=20

The subgraph deployed is here: 
https://thegraph.com/legacy-explorer/subgraph/crazyrabbitltc/poster-token?selected=playground

This proof of concept works by sending JSON messages to the Poster.sol contract on the Ethereum mainnet here: 0x81b28B981259409d0FCd361896efa4BD1514515A

To create a token you send: 

{"operation": "CREATE","supply": 1000,"name": "Test Token Name"}

To transfer a token you send: 

{"operaion": "TRANSFER", "token": "Test Token Name", "recipient": "Ethereum address here", "amount": 50}

People will probably send all sorts of stuff to test this and break the subgraph, but the concept works. :-) 

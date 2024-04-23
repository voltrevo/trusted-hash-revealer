# trusted-hash-revealer

Deployed: https://trusted-hash-revealer.deno.dev/keccak256

## About

Suppose Alice has provided Bob with `hash(messageFromAlice)` and Bob has
provided Alice with `hash(messageFromBob)`.

Alice wishes to know `messageFromBob` and Bob wishes to know `messageFromAlice`.
They are both happy in principle to reveal this information, but it would appear
one of them must go first. The person who goes second is supposed to
reciprocate, but they have the unfair option of abandoning the protocol instead.

A trusted hash revealer (THR) is a way to solve this problem via a trusted third
party. Alice and Bob both send their message to the THR and the hash of the
message they wish to know in exchange, and the THR only responds once all
messages have been provided.

This can be useful in MPC protocols since one party must learn the result of the
computation before everyone else, and has the option to abandon the protocol.
With some care, all meaningful parts of the computation can be hidden from the
THR, but the preimages it reveals can allow the participants to compute the last
step of the MPC fairly.

## `POST /keccak256`

Request:

```jsonc
{
  "hashGroup": [ // Must be ordered and contain hash(input)
    "(base64url-encoded hash)",
    "(base64url-encoded hash)",
    "(base64url-encoded hash)"
  ],
  "input": "(base64url-encoded input)"
}
```

Response:

```jsonc
[ // Same order as hashGroup
  "(base64url-encoded input)",
  "(base64url-encoded input)",
  "(base64url-encoded input)"
]
```

## Client Library

A client library is provided in `client.ts`. This enables working with
`Uint8Array`s directly, ensures `hashGroup` is ordered correctly, and provides a
more convenient API for identifying resulting messages.

For example usage, see `./manualTests/alice.ts` and `./manualTests/bob.ts`. Run
them concurrently to see the output:

```
$ ./manualTests/alice.ts
OOR6e3GdzmNmKur0NEAyb1Ubin7hmM7jXLXVF_LSlqI :: bob
```

```
$ ./manualTests/bob.ts  
nAJXEU65OZophfjnXa12AMXYn-OCT_qZ7Bw-uL87BQE :: alice
```

(This uses the deno deployed version, edit `manualTests/src/config.ts` to use
your instance instead.)

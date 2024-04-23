import {
  decodeBase64Url,
  encodeBase64Url,
} from "https://deno.land/std@0.223.0/encoding/base64url.ts";
import { Keccak256 } from "https://deno.land/std@0.65.0/hash/sha3.ts";
import bufferCmp from "./src/bufferCmp.ts";
import z from "https://deno.land/x/zod@v3.23.3/index.ts";

const ResponseBody = z.array(z.string());

export class TrustedHashRevealer {
  hashGroup: Uint8Array[] = [];

  constructor(public apiUrl: string, public input: Uint8Array) {
    this.add(new Uint8Array(new Keccak256().update(input).digest()));
  }

  add(hash: Uint8Array) {
    this.hashGroup.push(hash);
  }

  async resolve() {
    const sortedHashGroup = this.hashGroup.slice().sort(bufferCmp);

    const body = {
      hashGroup: sortedHashGroup.map((h) => encodeBase64Url(h)),
      input: encodeBase64Url(this.input),
    };

    const res = await fetch(this.apiUrl, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const parseResult = ResponseBody.safeParse(await res.json());

    if (parseResult.error) {
      throw new Error(
        `invalid response: ${JSON.stringify(parseResult.error.format())}`,
      );
    }

    const result = new ResolvedPreimages(
      parseResult.data.map((s) => decodeBase64Url(s)),
    );

    return result;
  }
}

export class ResolvedPreimages {
  map = new Map<string, Uint8Array>();

  constructor(preimages: Uint8Array[]) {
    for (const preimage of preimages) {
      const hashString = encodeBase64Url(
        new Uint8Array(new Keccak256().update(preimage).digest()),
      );

      this.map.set(hashString, preimage);
    }
  }

  getPreimage(hash: Uint8Array) {
    const hashString = encodeBase64Url(hash);

    const result = this.map.get(hashString);

    if (result === undefined) {
      throw new Error("Hash not found");
    }

    return result;
  }
}

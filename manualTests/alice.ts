#!/usr/bin/env -S deno run --allow-net

import { encodeBase64Url } from "https://deno.land/std@0.223.0/encoding/base64url.ts";
import { TrustedHashRevealer } from "../client.ts";
import { apiUrl, hashBob } from "./src/config.ts";

const thr = new TrustedHashRevealer(apiUrl, new TextEncoder().encode("alice"));
thr.add(hashBob);

const resolved = await thr.resolve();

console.log(
  `${encodeBase64Url(hashBob)} :: ${
    new TextDecoder().decode(resolved.getPreimage(hashBob))
  }`,
);

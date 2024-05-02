import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
import {
  decodeBase64Url,
  encodeBase64Url,
} from "https://deno.land/std@0.223.0/encoding/base64url.ts";
import { Keccak256 } from "https://deno.land/std@0.65.0/hash/sha3.ts";

import z from "https://deno.land/x/zod@v3.23.3/mod.ts";
import bufferCmp from "./src/bufferCmp.ts";

const Body = z.object({
  hashGroup: z.array(z.string()),
  input: z.string(),
});

const kv = await Deno.openKv();

serve(async (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/") {
    return Response.redirect(
      "https://github.com/voltrevo/trusted-hash-revealer",
    );
  }

  if (req.method !== "POST" || url.pathname !== "/keccak256") {
    return new Response("not found", {
      status: 404,
      headers: {
        "access-control-allow-origin": "*",
      },
    });
  }

  if (!req.body) {
    return new Response(JSON.stringify({ message: "missing body" }), {
      status: 400,
      headers: {
        "access-control-allow-origin": "*",
      },
    });
  }

  const parseResult = Body.safeParse(await req.json());

  if (parseResult.error) {
    return new Response(
      JSON.stringify({ message: parseResult.error.format() }),
      {
        status: 400,
        headers: {
          "access-control-allow-origin": "*",
        },
      },
    );
  }

  const body = parseResult.data;

  const hashGroup = body.hashGroup.map((s) => {
    const res = decodeBase64Url(s);

    if (res.length !== 32) {
      throw new Error("expected 32 bytes");
    }

    return res;
  });

  const input = decodeBase64Url(body.input);

  const encodedInputHash = encodeBase64Url(
    new Keccak256().update(input).digest(),
  );

  if (!body.hashGroup.includes(encodedInputHash)) {
    return new Response(
      JSON.stringify({ error: "hashGroup does not include hash(input)" }),
      {
        status: 400,
        headers: {
          "access-control-allow-origin": "*",
        },
      },
    );
  }

  if (!isOrdered(hashGroup, (a, b) => bufferCmp(a, b) === -1)) {
    return new Response(
      JSON.stringify({ message: "hashGroup is not ordered" }),
      {
        status: 400,
        headers: {
          "access-control-allow-origin": "*",
        },
      },
    );
  }

  const groupId = new Uint8Array(
    hashGroup.reduce(
      (hasher, el) => hasher.update(el),
      new Keccak256(),
    ).digest(),
  );

  setPreimage(groupId, input);

  const preimages = await Promise.all(
    hashGroup.map((h) => getPreimage(groupId, h)),
  );

  return new Response(
    JSON.stringify(preimages.map((buf) => encodeBase64Url(buf))),
    {
      headers: {
        "access-control-allow-origin": "*",
      }
    },
  );
});

function isOrdered<T>(values: T[], lessThan: (a: T, b: T) => boolean) {
  for (let i = 1; i < values.length; i++) {
    if (!lessThan(values[i - 1], values[i])) {
      return false;
    }
  }

  return true;
}

async function setPreimage(groupId: Uint8Array, value: Uint8Array) {
  const hash = new Uint8Array(new Keccak256().update(value).digest());
  await kv.set(["preimages", groupId, hash], value, { expireIn: 5 * 60_000 });

  return hash;
}

async function getPreimage(groupId: Uint8Array, hash: Uint8Array) {
  for await (const [entry] of kv.watch([["preimages", groupId, hash]])) {
    try {
      const value = entry.value as Uint8Array;
      const check = new Uint8Array(new Keccak256().update(value).digest());

      for (let i = 0; i < 32; i++) {
        if (hash[i] !== check[i]) {
          continue;
        }
      }

      return value;

      // deno-lint-ignore no-empty
    } catch {}
  }

  throw new Error("watch stream ended unexpectedly");
}

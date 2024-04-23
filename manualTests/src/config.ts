import { decodeBase64Url } from "https://deno.land/std@0.223.0/encoding/base64url.ts";

export const apiUrl = "http://localhost:8000/keccak256";

export const hashAlice = decodeBase64Url(
  "nAJXEU65OZophfjnXa12AMXYn-OCT_qZ7Bw-uL87BQE",
);

export const hashBob = decodeBase64Url(
  "OOR6e3GdzmNmKur0NEAyb1Ubin7hmM7jXLXVF_LSlqI",
);

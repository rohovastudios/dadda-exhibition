/**
 * Formspree → Sanity webhook (Cloudflare Worker)
 *
 * Env vars (wrangler secret):
 *   SANITY_PROJECT_ID
 *   SANITY_DATASET          (e.g. production)
 *   SANITY_WRITE_TOKEN      (Editor token with create/upload)
 *   FORMSPREE_WEBHOOK_SECRET (optional — verify X-Formspree-Signature)
 */

const FILE_FIELD_KEYS = ["supporting_images", "supporting_images[]", "signature_image"];

function pickString(data, ...keys) {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pickArray(data, ...keys) {
  for (const key of keys) {
    const value = data[key];
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string" && value) return [value];
  }
  return [];
}

function mapSubmissionDocument(data) {
  return {
    _type: "submission",
    status: "received",
    submittedAt: new Date().toISOString(),
    formspreeId: pickString(data, "_formsubmit_id", "submission_id"),
    fullLegalName: pickString(data, "full_legal_name"),
    preferredName: pickString(data, "preferred_name"),
    email: pickString(data, "email"),
    phone: pickString(data, "phone"),
    countryOfResidence: pickString(data, "country_of_residence"),
    preferredContactMethod: pickString(data, "preferred_contact_method"),
    remainAnonymous: pickString(data, "remain_anonymous"),
    fatherhoodRelationship: pickArray(data, "fatherhood_relationship", "fatherhood_relationship[]"),
    childrenInfo: pickString(data, "children_info"),
    response1Prompt: pickString(data, "response_1_prompt"),
    response1: pickString(data, "response_1"),
    response2Prompt: pickString(data, "response_2_prompt"),
    response2: pickString(data, "response_2"),
    response3Prompt: pickString(data, "response_3_prompt"),
    response3: pickString(data, "response_3"),
    followUpInterview: pickArray(data, "follow_up_interview", "follow_up_interview[]"),
    signature: pickString(data, "signature"),
    signatureType: pickString(data, "signature_type"),
    childFacesBlurred: false,
  };
}

function extractFileEntries(data) {
  const entries = [];

  for (const [key, value] of Object.entries(data)) {
    if (!FILE_FIELD_KEYS.some((field) => key === field || key.startsWith(field))) continue;

    if (Array.isArray(value)) {
      value.forEach((item) => entries.push({ key, item }));
      continue;
    }

    if (value && typeof value === "object" && value.url) {
      entries.push({ key, item: value });
    }
  }

  return entries;
}

async function uploadAsset(env, url, filename) {
  const fileRes = await fetch(url);
  if (!fileRes.ok) throw new Error(`Failed to fetch upload: ${filename}`);

  const contentType = fileRes.headers.get("content-type") || "application/octet-stream";
  const body = await fileRes.arrayBuffer();

  const uploadRes = await fetch(
    `https://${env.SANITY_PROJECT_ID}.api.sanity.io/v2021-06-07/assets/${env.SANITY_DATASET}/uploads`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SANITY_WRITE_TOKEN}`,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
      body,
    }
  );

  if (!uploadRes.ok) {
    throw new Error(`Sanity asset upload failed: ${await uploadRes.text()}`);
  }

  const asset = await uploadRes.json();
  return {
    _type: "image",
    asset: { _type: "reference", _ref: asset.document._id },
  };
}

async function createSubmission(env, doc) {
  const res = await fetch(
    `https://${env.SANITY_PROJECT_ID}.api.sanity.io/v2021-06-07/data/mutate/${env.SANITY_DATASET}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SANITY_WRITE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mutations: [{ create: doc }] }),
    }
  );

  if (!res.ok) {
    throw new Error(`Sanity mutate failed: ${await res.text()}`);
  }

  return res.json();
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const data = payload.data || payload;

    try {
      const doc = mapSubmissionDocument(data);
      const fileEntries = extractFileEntries(data);
      const supportingImages = [];
      let signatureImage = null;

      for (const { key, item } of fileEntries) {
        const url = typeof item === "string" ? item : item.url;
        const name = typeof item === "object" && item.filename ? item.filename : "upload.jpg";
        if (!url) continue;

        const imageRef = await uploadAsset(env, url, name);
        if (key.includes("signature")) {
          signatureImage = imageRef;
        } else {
          supportingImages.push(imageRef);
        }
      }

      if (supportingImages.length) doc.supportingImages = supportingImages;
      if (signatureImage) doc.signatureImage = signatureImage;

      const result = await createSubmission(env, doc);
      return Response.json({ ok: true, result });
    } catch (err) {
      return Response.json({ ok: false, error: err.message }, { status: 500 });
    }
  },
};

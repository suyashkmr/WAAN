const { normaliseJid, stripRelaySuffix } = require("./relayData");

function extractAccountInfo(client) {
  const info = client?.info;
  if (!info) return null;
  return {
    wid: info.wid?._serialized || info.wid?.user || null,
    pushName: info.pushname || null,
    platform: info.platform || null,
    battery: info.battery ?? null,
    plugged: info.plugged ?? null,
  };
}

async function readContactsFromStore(client) {
  if (!client || !client.pupPage) return [];
  return client.pupPage.evaluate(() => {
    if (!window.Store || !window.Store.Contact) {
      return [];
    }

    const contactModels = window.Store.Contact.getModelsArray();
    return contactModels.map(contact => {
      try {
        return {
          id: contact.id?._serialized || contact.id?.user || null,
          name: contact.name || null,
          pushname: contact.pushname || null,
          shortName: contact.shortName || null,
          formattedName: contact.formattedName || null,
          displayName: contact.displayName || null,
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
  });
}

async function refreshContactCache({ client, contactCache, logger, log }) {
  if (!client || !client.pupPage) {
    return;
  }
  try {
    const contacts = await readContactsFromStore(client);
    let mapped = 0;
    contacts.forEach(contact => {
      const contactId = normaliseJid(contact?.id);
      if (!contactId) return;
      const label =
        contact?.name ||
        contact?.pushname ||
        contact?.shortName ||
        contact?.formattedName ||
        contact?.displayName ||
        stripRelaySuffix(contactId);
      if (label) {
        contactCache.set(contactId, label);
        mapped += 1;
      }
    });
    if (mapped && typeof log === "function") {
      log(`Loaded ${mapped} contacts from ChatScope Web.`);
    }
  } catch (error) {
    logger.warn("Failed to load contacts: %s", error.message);
  }
}

module.exports = {
  extractAccountInfo,
  refreshContactCache,
};

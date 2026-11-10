import { useEffect, useState } from "react";
import { api } from "../shared/api";
import { CONNECT_URL, FLASHCARDS_URL, SUPPORTED_LANGUAGES, type Language } from "../shared/config";
import { languageName, t } from "../shared/i18n";
import { storage } from "../shared/storage";
import type { HistoryItem, Settings } from "../shared/types";
import { useExtensionState } from "./useStorage";

const openTab = (url: string) => {
  void chrome.tabs.create({ url });
  window.close();
};

export function App() {
  const { loaded, connection, settings, setSettings, history } = useExtensionState();
  const [shortcut, setShortcut] = useState<string>();

  useEffect(() => {
    chrome.commands.getAll().then((commands) => {
      setShortcut(commands.find((c) => c.name === "create-flashcard")?.shortcut || undefined);
    });
  }, []);

  // Validate the stored token once per popup open; the API layer drops it on 401.
  useEffect(() => {
    if (connection) api.me().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection?.token]);

  if (!loaded || !settings) return <div className="popup" />;

  return (
    <div className="popup">
      <header className="header">
        <img src="/icons/icon-32.png" width={24} height={24} alt="" />
        <span className="logo">Languito</span>
        <button className="link" onClick={() => openTab(FLASHCARDS_URL())}>
          {t("popupOpenApp")} ↗
        </button>
      </header>

      {connection ? (
        <>
          <SettingsForm settings={settings} onChange={setSettings} />
          <History items={history} shortcut={shortcut} />
          <footer className="footer">
            <span className="muted ellipsis">
              {connection.email ? t("popupConnectedAs", connection.email) : t("popupConnected")}
            </span>
            <button className="link danger" onClick={() => disconnect(connection.token)}>
              {t("popupDisconnect")}
            </button>
          </footer>
        </>
      ) : (
        <section className="connect">
          <h1>{t("popupNotConnectedTitle")}</h1>
          <p className="muted">{t("popupNotConnectedBody")}</p>
          <button className="primary" onClick={() => openTab(CONNECT_URL())}>
            {t("popupConnect")}
          </button>
        </section>
      )}
    </div>
  );
}

async function disconnect(token: string) {
  await storage.clearConnection();
  api.revokeToken(token).catch(() => {});
}

function SettingsForm({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const languageOptions = SUPPORTED_LANGUAGES.map((lang) => (
    <option key={lang} value={lang}>
      {languageName(lang)}
    </option>
  ));

  const setLanguage = (key: "learningLanguage" | "nativeLanguage", value: Language) => {
    const otherKey = key === "learningLanguage" ? "nativeLanguage" : "learningLanguage";
    // Picking the language already used on the other side swaps them.
    const next = { ...settings, [key]: value };
    if (settings[otherKey] === value) next[otherKey] = settings[key];
    onChange(next);
  };

  return (
    <section className="settings">
      <label>
        <span>{t("popupLearning")}</span>
        <select
          value={settings.learningLanguage}
          onChange={(e) => setLanguage("learningLanguage", e.target.value as Language)}
        >
          {languageOptions}
        </select>
      </label>
      <label>
        <span>{t("popupTranslateTo")}</span>
        <select
          value={settings.nativeLanguage}
          onChange={(e) => setLanguage("nativeLanguage", e.target.value as Language)}
        >
          {languageOptions}
        </select>
      </label>
      <label>
        <span>{t("popupLevel")}</span>
        <select
          value={settings.level}
          onChange={(e) => onChange({ ...settings, level: e.target.value as Settings["level"] })}
        >
          <option value="easy">{t("levelEasy")}</option>
          <option value="advanced">{t("levelAdvanced")}</option>
        </select>
      </label>
    </section>
  );
}

function History({ items, shortcut }: { items: HistoryItem[]; shortcut?: string }) {
  return (
    <section className="history">
      <div className="history-head">
        <h2>{t("popupRecent")}</h2>
        {items.length > 0 && (
          <button className="link small" onClick={() => openTab(FLASHCARDS_URL())}>
            {t("popupShowAll")} ↗
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="muted small">
          {t("popupRecentEmpty")}
          {shortcut && (
            <>
              <br />
              {t("popupShortcut", shortcut)}
            </>
          )}
        </p>
      ) : (
        <ul>
          {items.map(({ flashcard, createdAt }) => (
            <li key={`${flashcard.id}-${createdAt}`} title={flashcard.example}>
              <span className="front">{flashcard.term}</span>
              <span className="back">{flashcard.translation}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

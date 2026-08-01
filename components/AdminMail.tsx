'use client';

import { MailSettingsControl } from './controls/panels';

export default function AdminMail() {
  return (
    <div className="wl-admin-page" style={{ maxWidth: 640 }}>
      <div className="wl-page-head">
        <h1>Réglages e-mail</h1>
      </div>
      <MailSettingsControl />
    </div>
  );
}

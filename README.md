# ePaket Agent (Node.js)

Agent za Raspberry Pi koji se automatski povezuje na HUB i sluša FS komande.

## Konfiguracija
Promenljive okruženja:
- `HUB_URL` (podrazumevano: `http://localhost:8088`)
- `BASE_DIR` (podrazumevano: `/home/pi`)
- `HEARTBEAT_MS` (podrazumevano: `10000`)

## Pokretanje
```bash
npm i
HUB_URL=http://<HUB_IP>:8088 BASE_DIR=/home/pi npm start
```

## Systemd (primer)
Kreiraj `/etc/systemd/system/ep-agent.service`:
```ini
[Unit]
Description=ePaket Agent
After=network-online.target
Wants=network-online.target

[Service]
Environment=HUB_URL=http://<HUB_IP>:8088
Environment=BASE_DIR=/home/pi
WorkingDirectory=/opt/ep-agent
ExecStart=/usr/bin/node src/agent.js
Restart=always
User=pi
Group=pi

[Install]
WantedBy=multi-user.target
```

Zatim:
```bash
sudo mkdir -p /opt/ep-agent
sudo cp -r . /opt/ep-agent
cd /opt/ep-agent && npm i
sudo systemctl daemon-reload
sudo systemctl enable --now ep-agent
```
# agent

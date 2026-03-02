import csv
import os

CSV_DIR = r"D:\PX AgenturApp\INPUT\airtable csvs"
OUTPUT = r"D:\PX AgenturApp\INPUT\px_intern_import_logins_inventar.sql"
ENC_CSV = 'cp1252'  # Airtable Windows export encoding

def esc(val):
    if val is None or str(val).strip() == '':
        return 'NULL'
    val = str(val).strip().replace("'", "''")
    return f"'{val}'"

lines = []

# --- LOGINS ---
lines.append("\n-- ── 4. LOGINS ─────────────────────────────────────────────")
lines.append("INSERT INTO public.logins (name, website, login_name, passwort, anmerkung, kategorie, department) VALUES")
rows = []
with open(os.path.join(CSV_DIR, "Logins-Alle Logins .csv"), encoding=ENC_CSV) as f:
    reader = csv.DictReader(f)
    for row in reader:
        name = row.get('Name','').strip()
        website = row.get('Website','').strip()
        login = row.get('Login Name','').strip()
        pw = row.get('Passwort','').strip()
        anm = row.get('Anmerkung','').strip()
        kat = row.get('Kategorie','').strip()
        dept = row.get('Department ','').strip()
        if not any([name, website, login, pw]):
            continue
        rows.append(f"  ({esc(name)}, {esc(website)}, {esc(login)}, {esc(pw)}, {esc(anm)}, {esc(kat)}, {esc(dept)})")

lines.append(',\n'.join(rows) + ';')

# --- INVENTAR ITEMS ---
lines.append("\n-- ── 5. INVENTAR ITEMS ──────────────────────────────────────")
lines.append("INSERT INTO public.inventar_items (geraet, px_nummer, aufkleber, modell, seriennummer, ort, os, status, ip_office, ip_tiger, px_eigentum, handy_nr, notes, department, assigned_to_name) VALUES")
rows = []
with open(os.path.join(CSV_DIR, "IT Bestandsliste-Grid view.csv"), encoding=ENC_CSV) as f:
    reader = csv.DictReader(f)
    geraet_key = reader.fieldnames[0]  # handles BOM/encoding in first field
    for row in reader:
        geraet = row.get(geraet_key,'').strip()
        px_num = row.get('PX-Nummer','').strip()
        aufkl  = row.get('Aufkleber','').strip()
        mitarb = row.get('Mitarbeiter*in','').strip()
        dept   = row.get('Department','').strip()
        modell = row.get('(Modell-)Bezeichnung','').strip()
        serial = row.get('Seriennummer','').strip().replace('\n', ' / ')
        ort    = row.get('Ort','').strip() or '@Office'
        os_val = row.get('OS','').strip()
        status = row.get('Status','').strip() or 'Vorhanden'
        ip_off = row.get('IP Office','').strip()
        ip_tig = row.get('IP Tiger','').strip()
        eigent = row.get('PX Eigentum','').strip()
        handy  = row.get('HandyNr','').strip()
        notes  = row.get('Notes','').strip().replace('\n', ' ')
        is_px  = 'TRUE' if eigent == 'checked' else 'FALSE'
        if not geraet:
            continue
        rows.append(
            f"  ({esc(geraet)}, {esc(px_num)}, {esc(aufkl)}, {esc(modell)}, "
            f"{esc(serial)}, {esc(ort)}, {esc(os_val)}, {esc(status)}, "
            f"{esc(ip_off)}, {esc(ip_tig)}, {is_px}, {esc(handy)}, "
            f"{esc(notes)}, {esc(dept)}, {esc(mitarb)})"
        )

lines.append(',\n'.join(rows) + ';')

with open(OUTPUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f"Done: logins + {len(rows)} inventar rows -> {OUTPUT}")

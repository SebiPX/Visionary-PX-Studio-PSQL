export type ItemStatus = 'Vorhanden' | 'Fehlt' | 'Ausgeliehen' | 'Defekt'

export interface InventarItem {
  id: string
  created_at: string
  updated_at: string
  geraet: string
  px_nummer: string | null
  aufkleber: string | null
  modell: string | null
  seriennummer: string | null
  ort: string | null
  os: string | null
  status: ItemStatus
  ip_office: string | null
  ip_tiger: string | null
  px_eigentum: boolean
  handy_nr: string | null
  notes: string | null
  department: string | null
  kategorie?: string
  is_verleihartikel: boolean
  anschaffungsdatum: string | null
  anschaffungspreis: number | null
  bild_url: string | null
  assigned_to_name: string | null
  assigned_to_id: string | null
}

export interface ActiveLoan {
  id: string
  profile_id: string | null
  mitarbeiter_name: string | null
  department: string | null
  ausgeliehen_am: string
  zurueck_bis: string | null
  zurueck_am: string | null
  zweck: string | null
  notes: string | null
  created_by: string | null
  profile?: Profile | null
}

export interface InventarLoan extends ActiveLoan {
  created_at: string
  item_id: string
  item?: InventarItem
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string
}

export interface DashboardStats {
  total: number
  available: number
  loaned: number
  missing: number
  defective: number
  assigned: number
  totalValue: number
}

export interface VerleihscheinItem {
  id: string
  verleihschein_id: string
  item_id: string
  anschaffungspreis: number | null
  tagespreis: number | null
  gesamtpreis: number | null
  item?: InventarItem
}

export interface Verleihschein {
  id: string
  created_at: string
  borrower_type: 'team' | 'extern'
  profile_id: string | null
  extern_name: string | null
  extern_firma: string | null
  extern_email: string | null
  extern_telefon: string | null
  abholzeit: string
  rueckgabezeit: string
  prozentsatz: number
  gesamtkosten: number | null
  zweck: string | null
  notizen: string | null
  status: 'aktiv' | 'erledigt'
  erledigt_am: string | null
  created_by: string | null
  items?: VerleihscheinItem[]
  profile?: Profile | null
}

export interface Login {
  id: string
  created_at: string
  updated_at: string
  name: string | null
  website: string | null
  login_name: string | null
  passwort: string | null
  anmerkung: string | null
  kategorie: string | null
  department: string | null
}

export interface Handyvertrag {
  id: string
  created_at: string
  updated_at: string
  handynummer: string | null
  kartennummer: string | null
  pin: string | null
  puk: string | null
  pin2: string | null
  puk2: string | null
  anmerkung: string | null
  it_bestandsliste: string | null
}

export interface Kreditkarte {
  id: string
  created_at: string
  updated_at: string
  name: string | null
  nummer: string | null
  assignee: string | null
  ablaufdatum: string | null
  check_code: string | null
  pin_abheben: string | null
  secure_code: string | null
}

export interface Firmendatum {
  id: string
  created_at: string
  updated_at: string
  kategorie: 'Bankverbindung' | 'Handelsregister'
  bezeichner: string | null
  wert: string | null
  anmerkung: string | null
  datei_name: string | null
  sort_order: number
}

export interface InternalLink {
  id: string
  created_at: string
  updated_at: string
  titel: string
  url: string
  beschreibung: string | null
  kategorie: string | null
  sort_order: number
}


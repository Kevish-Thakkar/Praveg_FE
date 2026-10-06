import { dateTimeFromToday } from "@/lib/dates"
import { CITY_COORDS } from "@/constants/geo"
import type { Address, Client, Currency, Inspector, Organization, ProjectType, User, Vendor } from "@/types/domain"

export { COUNTRIES } from "@/constants/geo"

/** Seed helper: build an address from a known city (mock geocoding). */
export function addr(line: string, city: string): Address {
  const c = CITY_COORDS[city]
  if (!c) throw new Error(`Unknown seed city ${city}`)
  return { line, city, state: c.state, country: c.country, lat: c.lat, lng: c.lng }
}

export const organizations: Organization[] = [
  { id: "org_in", name: "Praveg Certification Services — India", code: "PCS-IN", emailDomain: "praveg.com", country: "India", city: "Ahmedabad", status: "Active" },
  { id: "org_me", name: "Praveg Certification Services — UAE", code: "PCS-AE", emailDomain: "praveg.com", country: "United Arab Emirates", city: "Dubai", status: "Active" },
]

export const currencies: Currency[] = [
  { code: "INR", name: "Indian Rupee", symbol: "₹", isBase: true },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", isBase: false },
]

/** Services the client can ask for */
export const projectTypes: ProjectType[] = [
  { id: "pt_tpi", name: "Third-Party Inspection", category: "Inspection", description: "Independent stage and final inspection at vendor works." },
  { id: "pt_vs", name: "Vendor Surveillance", category: "Inspection", description: "Periodic surveillance visits during manufacturing." },
  { id: "pt_psi", name: "Pre-Shipment Inspection", category: "Inspection", description: "Quantity, marking and packing verification before dispatch." },
  { id: "pt_fat", name: "Factory Acceptance Test", category: "Testing", description: "Witness of performance and functional tests at works." },
  { id: "pt_ndt", name: "NDT Testing", category: "Testing", description: "UT / RT / MT / PT examination and reporting." },
  { id: "pt_mt", name: "Material Testing", category: "Testing", description: "Mechanical and chemical testing witness." },
]

export const SKILLS = [
  "Pressure Vessels", "Heat Exchangers", "Piping", "Valves", "Rotating Equipment", "Structural Steel", "Electrical",
  "Instrumentation", "Coating", "Painting", "Welding", "NDT", "Forgings", "Material Testing", "Offshore", "Storage Tanks",
]

export const users: User[] = [
  { id: "usr_001", name: "Rajesh Nair", email: "rajesh.nair@praveg.com", role: "Super Admin", organizationId: "org_in", phone: "+91 98250 11420", status: "Active", lastActiveAt: dateTimeFromToday(0, 9, 12) },
  { id: "usr_002", name: "Priya Desai", email: "priya.desai@praveg.com", role: "Coordinator", organizationId: "org_in", phone: "+91 98795 30211", status: "Active", lastActiveAt: dateTimeFromToday(0, 8, 40) },
  { id: "usr_003", name: "Karan Patel", email: "karan.patel@praveg.com", role: "Coordinator", organizationId: "org_in", phone: "+91 99099 45310", status: "Active", lastActiveAt: dateTimeFromToday(0, 10, 5) },
  { id: "usr_004", name: "Sneha Iyer", email: "sneha.iyer@praveg.com", role: "Coordinator", organizationId: "org_in", phone: "+91 97240 88102", status: "Active", lastActiveAt: dateTimeFromToday(-1, 17, 30) },
  { id: "usr_005", name: "Arjun Rao", email: "arjun.rao@praveg.com", role: "Coordinator", organizationId: "org_me", phone: "+971 50 412 7781", status: "Active", lastActiveAt: dateTimeFromToday(-1, 14, 2) },
  { id: "usr_006", name: "Meera Shah", email: "meera.shah@praveg.com", role: "Accountant", organizationId: "org_in", phone: "+91 98980 22045", status: "Active", lastActiveAt: dateTimeFromToday(0, 9, 55) },
  { id: "usr_007", name: "Farah Siddiqui", email: "farah.siddiqui@praveg.com", role: "Coordinator", organizationId: "org_me", phone: "+971 55 208 9143", status: "Active", lastActiveAt: dateTimeFromToday(-3, 11, 20) },
  { id: "usr_008", name: "Rohit Joshi", email: "rohit.joshi@praveg.com", role: "Accountant", organizationId: "org_me", phone: "+971 52 731 0418", status: "Invited", lastActiveAt: null },
]

export const clients: Client[] = [
  {
    id: "cli_001", name: "Kaveri Petrochem Ltd", organizationId: "org_in", currency: "INR", mobile: "+91 22 6650 4100", email: "procurement@kaveripetrochem.in",
    address: addr("Plot 14, MIDC Trans-Thane Creek", "Navi Mumbai"), paymentTermsDays: 45, createdAt: dateTimeFromToday(-220),
    contacts: [
      { id: "cc_001", name: "Anil Kulkarni", email: "anil.kulkarni@kaveripetrochem.in", jobDescription: "Head — Quality Assurance", recipientRole: "To" },
      { id: "cc_002", name: "Deepa Menon", email: "deepa.menon@kaveripetrochem.in", jobDescription: "Expediting Engineer", recipientRole: "CC" },
      { id: "cc_003", name: "Suresh Pillai", email: "suresh.pillai@kaveripetrochem.in", jobDescription: "Procurement Manager", recipientRole: "BCC" },
    ],
  },
  {
    id: "cli_002", name: "Gulf Crest Engineering LLC", organizationId: "org_me", currency: "AED", mobile: "+971 2 555 0192", email: "qa@gulfcrest.ae",
    address: addr("Mussafah Industrial Area, M-26", "Mussafah"), paymentTermsDays: 60, createdAt: dateTimeFromToday(-180),
    contacts: [
      { id: "cc_004", name: "Omar Haddad", email: "omar.haddad@gulfcrest.ae", jobDescription: "QA/QC Manager", recipientRole: "To" },
      { id: "cc_005", name: "Lina Farouk", email: "lina.farouk@gulfcrest.ae", jobDescription: "Vendor Inspection Coordinator", recipientRole: "CC" },
    ],
  },
  {
    id: "cli_003", name: "Al Safwa Offshore Contracting LLC", organizationId: "org_me", currency: "AED", mobile: "+971 4 887 3120", email: "supplychain@alsafwa-offshore.ae",
    address: addr("JAFZA South, Plot S-40112", "Jebel Ali"), paymentTermsDays: 30, createdAt: dateTimeFromToday(-150),
    contacts: [
      { id: "cc_006", name: "Khalid Al Mansoori", email: "khalid.almansoori@alsafwa-offshore.ae", jobDescription: "Supplier Quality Lead", recipientRole: "To" },
      { id: "cc_007", name: "Rahul Menon", email: "rahul.menon@alsafwa-offshore.ae", jobDescription: "Package Engineer", recipientRole: "CC" },
    ],
  },
  {
    id: "cli_004", name: "Sahyadri Power Projects Ltd", organizationId: "org_in", currency: "INR", mobile: "+91 20 2712 3300", email: "projects@sahyadripower.in",
    address: addr("Survey No. 88, Hinjewadi Phase II", "Pune"), paymentTermsDays: 30, createdAt: dateTimeFromToday(-120),
    contacts: [
      { id: "cc_008", name: "Vikram Deshpande", email: "vikram.deshpande@sahyadripower.in", jobDescription: "Project Manager", recipientRole: "To" },
      { id: "cc_009", name: "Neha Gokhale", email: "neha.gokhale@sahyadripower.in", jobDescription: "Document Controller", recipientRole: "CC" },
    ],
  },
  {
    id: "cli_005", name: "Narmada Water Infrastructure Ltd", organizationId: "org_in", currency: "INR", mobile: "+91 265 233 6700", email: "sourcing@narmadawater.in",
    address: addr("Plot 212, GIDC Makarpura", "Vadodara"), paymentTermsDays: 45, createdAt: dateTimeFromToday(-90),
    contacts: [{ id: "cc_010", name: "Kavita Joshi", email: "kavita.joshi@narmadawater.in", jobDescription: "Sourcing Director", recipientRole: "To" }],
  },
  {
    id: "cli_006", name: "Desert Wind Energy PJSC", organizationId: "org_me", currency: "AED", mobile: "+971 2 617 4400", email: "inspection@desertwind.ae",
    address: addr("Al Maryah Island, Tower 2, Level 18", "Abu Dhabi"), paymentTermsDays: 60, createdAt: dateTimeFromToday(-60),
    contacts: [
      { id: "cc_011", name: "Yousef Al Hammadi", email: "yousef.alhammadi@desertwind.ae", jobDescription: "Inspection Manager", recipientRole: "To" },
      { id: "cc_012", name: "Priyanka Rao", email: "priyanka.rao@desertwind.ae", jobDescription: "Commercial Analyst", recipientRole: "BCC" },
    ],
  },
]

export const vendors: Vendor[] = [
  { id: "ven_001", name: "Anand Forge & Fittings Pvt Ltd", mobile: "+91 281 238 4410", email: "qc@anandforge.in", address: addr("GIDC Metoda, Plot G-1432", "Rajkot"), createdAt: dateTimeFromToday(-300) },
  { id: "ven_002", name: "Hazira Pressure Vessels Pvt Ltd", mobile: "+91 261 289 7740", email: "quality@hazirapv.in", address: addr("Hazira Industrial Area, Plot 7", "Hazira"), createdAt: dateTimeFromToday(-260) },
  { id: "ven_008", name: "Bharuch Tank & Structurals Pvt Ltd", mobile: "+91 2642 251 880", email: "qa@bharuchtank.in", address: addr("GIDC Ankleshwar Road, Plot 88", "Bharuch"), createdAt: dateTimeFromToday(-140) },
  { id: "ven_003", name: "Deccan Valves Pvt Ltd", mobile: "+91 40 2309 7760", email: "inspection@deccanvalves.in", address: addr("IDA Pashamylaram, Phase III", "Hyderabad"), createdAt: dateTimeFromToday(-240) },
  { id: "ven_004", name: "Sabarmati Pump Works Ltd", mobile: "+91 79 2583 1190", email: "export-qa@sabarmatipumps.in", address: addr("Phase IV, GIDC Naroda", "Ahmedabad"), createdAt: dateTimeFromToday(-210) },
  { id: "ven_005", name: "Jebel Ali Steel Structures FZE", mobile: "+971 4 881 5520", email: "qa@jasteel.ae", address: addr("JAFZA North, Plot N-3007", "Jebel Ali"), createdAt: dateTimeFromToday(-200) },
  { id: "ven_006", name: "Al Noor Heat Exchangers FZE", mobile: "+971 6 557 3094", email: "qc@alnoorhx.ae", address: addr("Hamriyah Free Zone, Plot HD-04", "Sharjah"), createdAt: dateTimeFromToday(-170) },
  { id: "ven_007", name: "Ras Al Khaimah Pipe Mills LLC", mobile: "+971 7 244 6180", email: "qa@rakpipemills.ae", address: addr("Al Hamra Industrial Zone, Plot 21", "Ras Al Khaimah"), createdAt: dateTimeFromToday(-160) },
]

type InspectorSeed = [id: string, name: string, nationality: string, city: string, line: string, currency: string, manDay: number, lumpSum: number, hourly: number, roundTrip: number, engagement: Inspector["engagementType"], skills: string[], quals: string[], status: Inspector["status"]]

const inspectorSeeds: InspectorSeed[] = [
  ["ins_001", "Ramesh Venkataraman", "Indian", "Chennai", "12, Anna Nagar East", "INR", 18000, 65000, 2400, 9000, "Freelance", ["Pressure Vessels", "Welding"], ["CSWIP 3.1", "API 510"], "Available"],
  ["ins_002", "Harpreet Singh Bedi", "Indian", "Vadodara", "B-22, Alkapuri Society", "INR", 16500, 60000, 2200, 3500, "Freelance", ["Piping", "Valves"], ["API 570", "ASNT Level II (UT)"], "On Assignment"],
  ["ins_003", "Mohammed Al-Farsi", "Omani", "Dubai", "Al Nahda 2, Building 14", "AED", 1800, 6500, 240, 300, "Supplier-based", ["Rotating Equipment", "Instrumentation", "Piping"], ["API 610 Training", "ISO 9001 Lead Auditor"], "Available"],
  ["ins_004", "Klaus Wagner", "German", "Abu Dhabi", "Al Reem Island, Sky Tower", "AED", 2900, 10500, 390, 600, "Freelance", ["Pressure Vessels", "NDT"], ["EN ISO 9712 Level 3", "CSWIP 3.2"], "Available"],
  ["ins_005", "Giulia Romano", "Italian", "Dubai", "JLT Cluster D, Tower 3", "AED", 2700, 9800, 360, 300, "Freelance", ["Valves", "Coating"], ["NACE CIP Level 2", "API 598"], "Available"],
  ["ins_006", "Tomasz Kowalczyk", "Polish", "Dubai", "Discovery Gardens, Bldg 42", "AED", 2200, 8000, 300, 250, "Outsourced", ["Structural Steel", "Welding"], ["IWI-C", "EN ISO 9712 Level 2"], "Available"],
  ["ins_007", "Suresh Babu Nair", "Indian", "Mumbai", "Chembur West, Plot 7", "INR", 15500, 56000, 2100, 6500, "Supplier-based", ["Piping", "Material Testing", "NDT"], ["AWS CWI", "ASNT Level II (RT)"], "On Assignment"],
  ["ins_008", "Anil Deshmukh", "Indian", "Nashik", "College Road, Flat 302", "INR", 19000, 68000, 2500, 5000, "Freelance", ["Rotating Equipment", "Electrical"], ["API 610 Training", "CEng (IEI)"], "Available"],
  ["ins_009", "Sanjay Kulkarni", "Indian", "Pune", "Kothrud, Lane 5", "INR", 15000, 55000, 2000, 6000, "Freelance", ["Electrical", "Instrumentation", "Valves"], ["CEng (IET)", "ISA CCST Level II"], "Available"],
  ["ins_010", "Ahmed Rashid", "Emirati", "Abu Dhabi", "Khalifa City A, Villa 118", "AED", 2100, 7400, 280, 400, "Freelance", ["Pressure Vessels", "Heat Exchangers"], ["API 510", "ASME Section VIII Training"], "Available"],
  ["ins_011", "Fatima Zahra Benali", "Moroccan", "Sharjah", "Al Majaz 3, Tower B", "AED", 1650, 6000, 220, 150, "Outsourced", ["Coating", "Painting"], ["NACE CIP Level 3", "FROSIO"], "Available"],
  ["ins_012", "James O'Connor", "Irish", "Abu Dhabi", "Al Raha Beach, Building 5", "AED", 2400, 8800, 330, 450, "Freelance", ["Structural Steel", "Offshore", "Welding"], ["CSWIP 3.1", "BGAS Grade 2"], "Available"],
  ["ins_013", "Vijay Raghavan", "Indian", "Hyderabad", "Madhapur, Road 12", "INR", 14500, 52000, 1900, 2500, "Supplier-based", ["Valves", "Piping"], ["API 598", "ASNT Level II (PT/MT)"], "Available"],
  ["ins_014", "Park Ji-hoon", "Korean", "Ruwais", "Ruwais Housing Complex, Block 9", "AED", 2600, 9500, 350, 900, "Freelance", ["Pressure Vessels", "Welding"], ["KWS Welding Inspector", "API 510"], "Available"],
  ["ins_015", "Neha Kapoor", "Indian", "Mumbai", "Powai, Hiranandani Gardens", "INR", 17000, 62000, 2300, 6000, "Freelance", ["Offshore", "Electrical"], ["IECEx CoPC", "OPITO BOSIET"], "Inactive"],
  ["ins_016", "Pradeep Chauhan", "Indian", "Rajkot", "Kalawad Road, Shivam Park", "INR", 13000, 48000, 1700, 2000, "Freelance", ["Forgings", "Material Testing"], ["ASNT Level II (UT)", "ISO 17025 Internal Auditor"], "Available"],
  ["ins_017", "Carlos Méndez", "Spanish", "Dubai", "Dubai Marina, Marina Heights", "AED", 2500, 9200, 340, 300, "Outsourced", ["Rotating Equipment", "Valves"], ["API 598", "API 610 Training"], "Available"],
  ["ins_018", "Arvind Menon", "Indian", "Dubai", "Al Qusais 1, Building 7", "AED", 1750, 6300, 230, 300, "Freelance", ["Piping", "Welding"], ["CSWIP 3.1", "API 570"], "On Assignment"],
  ["ins_019", "Mehul Trivedi", "Indian", "Ahmedabad", "Satellite Road, Shivalik Plaza", "INR", 14000, 50000, 1850, 1500, "Freelance", ["Rotating Equipment", "Pressure Vessels", "Storage Tanks"], ["API 653", "API 610 Training"], "Available"],
  ["ins_020", "Kiran Solanki", "Indian", "Vadodara", "Gotri Road, Sun Residency", "INR", 13500, 49000, 1800, 1500, "Supplier-based", ["Pressure Vessels", "NDT", "Welding"], ["ASNT Level II (UT/RT)", "CSWIP 3.1"], "Available"],
  ["ins_021", "Imran Shaikh", "Indian", "Surat", "Adajan, Riverfront Towers", "INR", 15000, 54000, 2000, 1200, "Freelance", ["Pressure Vessels", "Welding", "Piping"], ["API 510", "AWS CWI"], "Available"],
  ["ins_022", "Rashid Al Nuaimi", "Emirati", "Sharjah", "Muwaileh Commercial, Bldg 3", "AED", 1900, 6900, 250, 200, "Freelance", ["Heat Exchangers", "Piping", "Rotating Equipment"], ["API 570", "API 610 Training"], "Available"],
]

function phoneFor(country: string, i: number): string {
  const n = String(1000000 + i * 734219).slice(-7)
  return country === "India" ? `+91 9${n.slice(0, 4)} ${n.slice(4)}${String(i).padStart(2, "0")}` : `+971 5${i % 6} ${n.slice(0, 3)} ${n.slice(3)}`
}

export const inspectors: Inspector[] = inspectorSeeds.map(
  ([id, name, nationality, city, line, currency, manDayRate, lumpSumRate, hourlyRate, roundTrip, engagementType, skills, qualifications, status], i) => {
    const address = addr(line, city)
    return {
      id,
      organizationId: address.country === "India" ? "org_in" : "org_me",
      name,
      email: `${name.toLowerCase().normalize("NFD").replace(/[̀-ͯ']/g, "").replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@inspector-mail.com`,
      phone: phoneFor(address.country, i + 1),
      nationality,
      address,
      currency,
      manDayRate,
      lumpSumRate,
      hourlyRate,
      roundTrip,
      engagementType,
      skills,
      qualifications,
      status,
      createdAt: dateTimeFromToday(-400 + i * 11),
    }
  },
)

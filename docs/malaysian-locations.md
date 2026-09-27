# Malaysian location reference data

The database now includes 13 states and 3 federal territories (16 top-level choices), plus all 160 reporting units in DOSM's 2025 district dataset. Perlis and the three federal territories are unsplit reporting units. Three existing city choices (Shah Alam, Subang Jaya and George Town) remain alongside districts, for 163 city/district records with the development seed.

Source: Department of Statistics Malaysia, https://data.gov.my/data-catalogue/population_district ; CSV https://storage.dosm.gov.my/population/population_district.csv . Snapshot year 2025, retrieved 27 September 2026. Licensed CC BY 4.0: https://creativecommons.org/licenses/by/4.0/ . Extracted distinct state/district pairs only. Source names W.P. Kuala Lumpur/Labuan/Putrajaya are shortened for display; Pulau Pinang uses the existing Penang name and slug.

The checked-in supabase/reference/malaysian-districts.json records coverage and attribution. Migration 20260927000200 inserts reference data on fresh and existing databases, preserving existing UUIDs and vendor relations. Reference data is suitable for production; fictional seed businesses remain development-only. No runtime external API is required.

This is complete coverage of the cited district reporting list, NOT an exhaustive list of every neighbourhood, mukim, taman or postcode. Seven existing curated localities remain. Locality is optional; vendors without a listed locality can select a district and put their neighbourhood in the address. City and administrative district choices share the existing cities table; this is not a new geographic containment model. Add verified localities later through new migrations, with source attribution and correct parents. Never guess locality-to-district mappings.

For future refreshes, compare newer DOSM snapshots with this reference file, preserve identifiers, and add a new migration. Do not rename or move existing vendor locations automatically.

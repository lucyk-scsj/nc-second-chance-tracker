# NC Second Chance Tracker

A public dashboard from the Southern Coalition for Social Justice (SCSJ) tracking how many North Carolinians get their criminal records cleared, by which route, and how far that falls short of who is eligible.

**Status:** prototype (Phase 1). Built entirely from public reports.

## What it shows

- Expunctions per fiscal year, split into automatic (G.S. 15A-146(a4)) and petition-based
- Petition expunctions by type: dismissals, adult convictions (15A-145.5), under-18 convictions (15A-145.8A), other
- The conviction-relief gap: estimated eligible people vs. conviction expunctions granted
- A timeline of Second Chance Act implementation, including the 2022–2024 pause
- The full table of expunctions by statute

## How it's built

A plain static site. No build step, no frameworks.

```
docs/                            everything GitHub Pages publishes
  index.html                     page layout and styles
  app.js                         reads the CSVs and draws the charts, tiles, timeline and table
  data/
    expunctions_by_statute.csv   one row per fiscal year × statute (from AOC reports)
    report_totals.csv            the grand total AOC reports for each year (used to check the rows)
    eligibility_estimates.csv    published estimates of who is eligible
    timeline.csv                 implementation milestones
scripts/validate_data.py         checks that statute rows add up to the AOC totals
.github/workflows/               runs the check on every change to docs/data/
```
## Updating the data each year

The AOC reports to the General Assembly by **September 1** each year (G.S. 15A-160). The report appears on the Joint Legislative Oversight Committee on Justice and Public Safety's page at ncleg.gov.

1. Add one row per statute for the new fiscal year to `docs/data/expunctions_by_statute.csv`. Use the existing `category` for each statute. A new statute needs a category: `automatic`, `petition_nonconviction`, `adult_conviction`, `youth_conviction`, or `other`.
2. Add the report's grand total to `docs/data/report_totals.csv`.
3. Run `python scripts/validate_data.py`. It must say "All years match." (GitHub runs this automatically too.)
4. Add any new milestones to `docs/data/timeline.csv` (`type` is `milestone` or `setback`).

Commit and push with GitHub Desktop (below). The page picks up new years, the pause shading, and all the headline numbers automatically.

AOC sometimes revises earlier years in later reports. When the figures differ, use the most recent report and update the `source` column.

## Running it locally

The page loads CSV files, so it needs a web server rather than opening the file directly:

```
cd docs
python -m http.server 8000
```

Then open http://localhost:8000.

## Publishing with GitHub Pages

In the repository: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, then choose branch `main` and folder `/docs` and click **Save**. The site will be at `https://lucyk-scsj.github.io/nc-second-chance-tracker/` a minute or two later.

## Making changes (the reliable way)

Use GitHub Desktop rather than editing files on the GitHub website.

1. GitHub Desktop → **Fetch origin**, then **Pull origin** if it offers.
2. **Repository → Show in Finder/Explorer** to open the local folder.
3. Edit or replace files there with a plain text editor (not TextEdit's rich text mode). CSV files can also be edited in Excel or Numbers, but save them as CSV.
4. Back in GitHub Desktop: write a summary → **Commit to main** → **Push origin**.
5. If the push is rejected, **Fetch origin** → **Pull origin**, then push again.
6. On github.com, the **Actions** tab shows the data check. A green check means the numbers add up.

## Roadmap

- **Phase 2 (public records request):** expunctions by county, statute and year; race, ethnicity, sex and age of petitioners; petitions filed vs. granted vs. denied; fee waivers. Adds a county map of conviction relief per 10,000 adults.
- **Phase 3 (research partnership):** person-level eligibility under current law from AOC court data (the UNC Criminal Justice Innovation Lab already models this), the gap by race and county, policy scenarios, and downstream compliance by agencies and background-check companies.

## Sources

- NC AOC, [2025 Expunctions Report](https://webservices.ncleg.gov/ViewDocSiteFile/101052) (FY 2020–21 to 2024–25)
- NC AOC, [2022 Expunctions Report](https://webservices.ncleg.gov/ViewDocSiteFile/71510) (FY 2017–18 to 2019–20)
- Paper Prisons, [The North Carolina Second Chance Expunction Gap](https://paperprisons.org/states/pdfs/reports/The%20North%20Carolina%20Second%20Chance%20Expunction%20Gap.pdf)
- Axios Raleigh, [Wake County ending era of online mug shots](https://www.axios.com/local/raleigh/2026/07/22/wake-county-mug-shots-arrest-records) (July 22, 2026)
- UNC Criminal Justice Innovation Lab, [NC Record Clearance Dashboard](https://www.sog.unc.edu/blogs/nc-criminal-law/new-dashboard-shows-impact-record-clearance-policies-north-carolina)

Counts are expunction orders and cases, not unique people. Fiscal years run July 1 to June 30.

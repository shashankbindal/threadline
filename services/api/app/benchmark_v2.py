"""Benchmark v2: the original 50 sentences (subset 'v1') plus 104 new hand-written ones.

All sentences are fictional (Nimbus Shield). Labels (risky/safe) and the expected rule
were written by the prototype authors against the written brand/legal rules in the seed
data; they were NOT adjudicated by independent people. Real independent labels are collected
through /annotation/* and measured by /annotation/agreement. The new items were written
to include paraphrases a regex engine is likely to miss and benign near-misses it is likely
to flag; they were not tuned to make any system look good.
"""
from .benchmark import BENCHMARK

# (text, risky?, expected_rule_id or None)
V2_EXTRA: list[tuple[str, bool, str | None]] = [
    # --- risky: R-012 absolute / predictive security claims ---
    ("No threat will ever slip through Nimbus Shield.", True, "R-012"),
    ("Your inbox is bulletproof from day one.", True, "R-012"),
    ("Nimbus Shield catches all attacks, every time.", True, "R-012"),
    ("We guarantee your team will never be phished again.", True, "R-012"),
    ("Total protection, no exceptions.", True, "R-012"),
    ("Malware simply cannot get through our filter.", True, "R-012"),
    ("An airtight barrier against every phishing attempt.", True, "R-012"),
    ("Nimbus Shield predicts attacks before they happen.", True, "R-012"),
    ("Forget breaches; they are a thing of the past with Nimbus Shield.", True, "R-012"),
    ("100% of phishing emails stopped, guaranteed.", True, "R-012"),
    ("Completely secure email for your whole company.", True, "R-012"),
    ("We see threats coming before anyone else does.", True, "R-012"),
    ("Attackers have no way in once the agent is installed.", True, "R-012"),
    ("Never worry about ransomware again.", True, "R-012"),
    ("Our filter is flawless against social engineering.", True, "R-012"),
    # --- risky: R-019 compliance claims ---
    ("Nimbus Shield makes your company HIPAA compliant.", True, "R-019"),
    ("We are officially certified for ISO 27001.", True, "R-019"),
    ("Pass your GDPR audit automatically with Nimbus Shield.", True, "R-019"),
    ("Nimbus Shield is PCI-DSS compliant.", True, "R-019"),
    ("Our product carries a SOC 2 certification.", True, "R-019"),
    ("Hospitals choose us because we are HIPAA certified.", True, "R-019"),
    ("Stay audit-ready and legally covered for every regulation.", True, "R-019"),
    ("Regulators will accept Nimbus Shield as full proof of compliance.", True, "R-019"),
    ("Install Nimbus Shield and your compliance worries are over.", True, "R-019"),
    ("Certified to meet all data privacy laws.", True, "R-019"),
    # --- risky: F-07 onboarding contradicts ~20 minutes ---
    ("Zero setup required; just switch it on.", True, "F-07"),
    ("Protected in under 60 seconds.", True, "F-07"),
    ("There is nothing to install or configure.", True, "F-07"),
    ("Instantly deploy to every mailbox with one click.", True, "F-07"),
    ("Go live the moment you sign up.", True, "F-07"),
    ("No installation, no waiting.", True, "F-07"),
    ("Ready in seconds, no IT help needed.", True, "F-07"),
    ("Our zero config agent protects you immediately.", True, "F-07"),
    # --- risky: F-11 wrong customer count ---
    ("More than 12,000 companies rely on Nimbus Shield.", True, "F-11"),
    ("Used by 25000 organizations around the globe.", True, "F-11"),
    ("Over 3,000 teams already trust us.", True, "F-11"),
    ("Nimbus Shield protects 1,000,000 customers.", True, "F-11"),
    ("Join the 7,500 teams that made the switch.", True, "F-11"),
    ("Half a million inboxes and 9,000 companies are protected today.", True, "F-11"),
    ("Thousands upon thousands of customers choose us every day.", True, "F-11"),
    # --- risky: R-021 superlatives ---
    ("The most advanced email security available.", True, "R-021"),
    ("Industry-leading detection, period.", True, "R-021"),
    ("World-class protection for any size of team.", True, "R-021"),
    ("Our product is number one in phishing defense.", True, "R-021"),
    ("Unrivaled accuracy compared with every competitor.", True, "R-021"),
    ("Nothing on the market beats Nimbus Shield.", True, "R-021"),
    ("Best-in-class threat intelligence.", True, "R-021"),
    ("Simply the smartest filter ever built.", True, "R-021"),
    # --- risky: T-03 / T-05 vocabulary ---
    ("NS integrates with your existing mail provider.", True, "T-03"),
    ("Ask your admin to roll out NS this quarter.", True, "T-03"),
    ("Hackers hate this one trick.", True, "T-05"),
    ("Outsmart every hacker with a single click.", True, "T-05"),
    ("Learn how hacking groups target finance teams.", True, "T-05"),
    ("We got hacked last year, and then we found Nimbus Shield.", True, "T-05"),
    # --- safe: near-misses and benign copy ---
    ("Nimbus Shield helps reduce phishing exposure for distributed teams.", False, None),
    ("Setup takes about 20 minutes, including connecting your identity provider.", False, None),
    ("We support 4,200 teams as of October 2026.", False, None),
    ("Our detection rate was 97.2% in the 2026 Detection Benchmark, on a curated test set.", False, None),
    ("Nimbus Shield can support your HIPAA program, but it does not make you compliant on its own.", False, None),
    ("Customers remain responsible for their own compliance obligations.", False, None),
    ("The report explains why 100% protection is not a realistic goal.", False, None),
    ("No product can guarantee that every attack is stopped.", False, None),
    ("Our SOC 2 Type II report is available to customers on request under NDA.", False, None),
    ("Legal reviews every compliance statement before publication.", False, None),
    ("Compare plans side by side on the pricing page.", False, None),
    ("Our team has a hack day each quarter for internal tools.", False, None),
    ("The CEO shared a short note after the all-hands on Friday.", False, None),
    ("Quarterly release notes are published on the first Tuesday of the month.", False, None),
    ("Open the settings page and choose Integrations.", False, None),
    ("Reply to the alert email to report a false positive.", False, None),
    ("The agent uses roughly 2% of CPU on a typical laptop.", False, None),
    ("Alerts can be forwarded to Slack or Microsoft Teams.", False, None),
    ("Contact the security team if you receive a suspicious message.", False, None),
    ("All data is encrypted in transit and at rest.", False, None),
    ("Administrators can export the audit log as a CSV file.", False, None),
    ("We never use the words unbreakable or guaranteed in security copy.", False, None),
    ("This guide shows how to deploy the agent to a pilot group of 50 users.", False, None),
    ("Training videos are available in English, French and German.", False, None),
    ("Our office will be closed on public holidays.", False, None),
    ("Rated 4.5 out of 5 by 1,200 survey respondents in October 2026.", False, None),
    ("Join our community forum to share tips with other admins.", False, None),
    ("The press kit includes logos, screenshots and approved boilerplate.", False, None),
    ("Use the full product name, Nimbus Shield, in all headlines.", False, None),
    ("Nimbus Shield reviews links in messages and warns users about suspicious ones.", False, None),
    ("We aim to answer every support ticket within one business day.", False, None),
    ("Read how the 2026 Detection Benchmark was designed and scored.", False, None),
    ("Some phishing messages may still reach users, so keep awareness training going.", False, None),
    ("Version 3.2 adds a weekly digest and a new dashboard layout.", False, None),
    ("A hacker conference is not on our events calendar this year.", False, None),
    ("The compliance team will review this document on Wednesday.", False, None),
    ("Start a 14-day trial from the website.", False, None),
    ("Customers in the finance sector make up about a third of our accounts.", False, None),
    ("Our mission is to help small teams spot phishing earlier.", False, None),
    ("Billing questions go to the finance contact listed on your invoice.", False, None),
    ("The best way to get started is to read the onboarding guide.", False, None),
    ("Nimbus Shield was named in the 2026 vendor landscape report.", False, None),
    ("Employees can report a message with one click in the mail client.", False, None),
    ("Data residency options include the EU and the US.", False, None),
    ("Thanks to everyone who joined the webinar last week.", False, None),
    ("The platform keeps a 12-month history of detected threats.", False, None),
    ("We publish a transparency summary of detection results every quarter.", False, None),
    ("Learn what GDPR requires of email marketers.", False, None),
    ("Our guarantee page explains the refund terms for annual plans.", False, None),
    ("Plan your rollout with the migration checklist.", False, None),
    ("The webinar covers common ransomware entry points and how teams respond.", False, None),
    ("Sign in with single sign-on using your identity provider.", False, None),
    ("A hacked account should be reported to your admin immediately.", False, None),
]


def v2_items() -> list[dict]:
    """All v2 items with stable ids: v1 subset first ('v1-###'), then new ('v2-###')."""
    items = [{"id": f"v1-{i + 1:03d}", "text": t, "risky": r, "rule": rule, "subset": "v1"}
             for i, (t, r, rule) in enumerate(BENCHMARK)]
    items += [{"id": f"v2-{i + 1:03d}", "text": t, "risky": r, "rule": rule, "subset": "v2-new"}
              for i, (t, r, rule) in enumerate(V2_EXTRA)]
    return items


def items_for(which: str) -> list[dict]:
    allv = v2_items()
    return [x for x in allv if x["subset"] == "v1"] if which == "v1" else allv

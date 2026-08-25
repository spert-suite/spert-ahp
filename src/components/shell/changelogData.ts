// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

export interface ChangelogEntry {
  version: string;
  date: string;
  sections: {
    title: string;
    items: string[];
  }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.18.34',
    date: 'August 24, 2026',
    sections: [
      {
        title: 'Changed',
        items: [
          'The time a decision records as \u201clast changed\u201d is now written as plain text, matching the rest of the SPERT\u00ae Suite. Nothing about how you build or score a decision changed, and no stored decision data was altered.',
          'This app stored that time as a number of milliseconds while four of the seven suite apps store it as text, and the shared service that adds someone to a decision wrote a third form again. One of those apps reads decisions this one can share with, and formatting refuses rather than shrugs when handed the wrong form \u2014 so that app\u2019s project list could fail to draw a row after somebody was added. All thirteen places this app writes that time now write plain text, and the field\u2019s declared type was changed to match.',
        ],
      },
      {
        title: 'Internal',
        items: [
          'Three of the thirteen sit in functions where a single value is calculated once and used for both the \u201clast changed\u201d time and the \u201ccreated\u201d time. Changing that one value \u2014 the tidy-looking edit \u2014 would have silently converted the creation date too, which is read and is not part of this change. The change was made at each of the thirteen fields instead, leaving the shared value alone.',
          'The safeguard that was supposed to catch that mistake did not cover two of the three places. The plan for this work said the type checker would reject the tidy edit because the creation date is still declared as a number. Measured: making that edit in the first two of the three functions compiles cleanly, because the expression feeding the creation date falls back to the shared value only when the existing one is missing \u2014 and since it can never be missing, the type checker never looks at the fallback. Only the third was caught, and by a different field entirely. Those three declarations now state their type explicitly, which turns the mistake into an error on the declaration line. Confirmed at all three.',
          'Each of the thirteen is checked separately rather than one check for the file: twelve could be left unconverted and a single check would still pass, which is the shape of the fault being fixed. Reverting all thirteen fails thirteen of the fourteen checks; reverting one fails exactly one.',
        ],
      },
    ],
  },
  {
    version: '0.18.33',
    date: '2026-08-23',
    sections: [
      {
        title: 'Security — four advisories introduced by the previous release are closed',
        items: [
          'Installing the mutation-testing tool last release brought in 112 supporting packages, and three of them carried security advisories between them \u2014 one high, two moderate. None had been present beforehand. All four advisories are now closed, with no major version change anywhere. Security only: no functional, data, or interface changes.',
          'None of the three ever reached the application. All are development-only dependencies of that tool, so none forms part of the code served to a browser. That is why this is a correction rather than an incident \u2014 but it is still a correction, because the previous release reported a clean result and the result was no longer clean.',
          'One of the three was flagged only because it depended on an old version of another. Updating that other package cleared it too, which was verified rather than assumed \u2014 the alternative would have needed a major version change and a separate decision.',
          'The oldest fixed version was taken rather than the newest, and it mattered more here than anywhere. The automatic tool would have installed a version published the same day this was written; the one taken is three weeks old and clears exactly the same three advisories. There was no fully settled option on that line, so it is recorded as an exception. The other package needed no exception at all: the oldest version that escapes its advisory is over three months old.',
          'How the gap happened, written down because the reason is more useful than the fact. The previous release did check all 112 new packages \u2014 for settling time, confirming none was newer than the 60-day threshold. It did not check them for advisories. Those are two different questions about the same list; one instruction covered both, and only one was answered. It was caught by re-reading the previous release\u2019s own summary after it had shipped, which is the last and weakest place to catch anything.',
          'Both new pins carry written notes naming the advisories they escape, and the check added two releases ago \u2014 which fails the build if a pin and its note disagree \u2014 accepted them unchanged.',
        ],
      },
    ],
  },
  {
    version: '0.18.32',
    date: '2026-08-23',
    sections: [
      {
        title: 'Internal — mutation testing, and a recorded baseline for the calculation core',
        items: [
          'A second kind of measurement was added. It changes the code in small ways on purpose \u2014 flips a comparison, deletes a call, swaps an operator \u2014 and re-runs the tests. A change that no test objects to is a change the tests cannot see. Development tooling only: no application code was altered, and nothing about how the app works, looks, or stores data changes.',
          'The result, recorded as a baseline rather than a target: of 928 usable changes made to the five calculation files, 632 were caught and 277 were not. Nothing was fixed in response, no threshold is set, and this measurement deliberately cannot fail a release.',
          'The most useful thing it found is a limit on itself. Four places in the calculation core carry the same one-line safety floor. Last release showed by hand that three are genuinely load-bearing and the fourth is redundant \u2014 a duplicate of another, either one sufficient. This tool reports all four identically, because it only knows how to invert that line rather than remove it, and inverting it breaks everything either way. A passing result there means the inversion was caught, not that the floor is tested. That is written down so nobody later mistakes one for the other.',
          'It also found something the by-hand pass could not reach. The calculation that derives priority weights repeats until it settles \u2014 forty-seven rounds on a deliberately inconsistent example. The loop runs, but the only thing checked about that example is a bound loose enough that a single round would satisfy it too. So the settling machinery is exercised without being checked: the same weakness the previous release fixed for individual safety checks, found this time inside a loop, where hand inspection had not looked.',
          'One of the five files scores far below the others and is deliberately left unanalysed \u2014 78 uncaught changes against 46 caught. It is named in the record as the obvious first target for anyone continuing this work.',
          'Three protections were added for the tool\u2019s working directory, which holds a full copy of the source with one file deliberately corrupted. It is now kept out of version control (this project is public), out of the code-style check, and out of the scoped test run. The middle one mattered more than it looks: with that directory present and not excluded, the code-style check went from 42 findings to 254, and every one was a failure to read the code at all \u2014 including the real files, not only the copies.',
          'Development tooling only. No functional, data, or interface changes.',
        ],
      },
    ],
  },
  {
    version: '0.18.31',
    date: '2026-08-23',
    sections: [
      {
        title: 'Internal — six safety checks in the calculation core are now genuinely tested',
        items: [
          'Six defensive checks inside the decision calculations are now actually tested. Each was already being run by the existing tests \u2014 it simply made no difference to any of them whether the check was there or not. Tests only: no application code changed, and nothing about how the app works, looks, or stores data changes.',
          'Each of the six was verified by breaking the code on purpose. First by deleting the check and confirming a test fails; then by replacing it with a plausible but wrong version and confirming a test fails again. The second step matters: a test written only against deletion can end up tuned to the exercise rather than to the behaviour.',
          'What the six protect, in plain terms: a criterion nobody compared still gets a weight instead of disappearing from the consistency figure; an unusable weight is left out of that figure rather than making it infinite; a set of weights with nothing usable in it reports "perfectly consistent" rather than reporting nothing; a panel where every voter is indifferent reports full agreement instead of displaying the text "NaN" on the results screen; an option scoring zero against every criterion stays distinguishable from one that was deleted; and a criterion judged overwhelmingly less important than the rest cannot collapse to a vanishingly small weight.',
          'One existing test was removed and replaced. It was named after the safety check it claimed to verify, and it verified only that the check existed \u2014 it passed just the same with the check taken out, because its example never came close to the situation the check is for. It was also claiming a guarantee the design cannot give: the last entry in the list is deliberately set to whatever makes the total come to exactly one, so it is the single entry that guarantee cannot cover. It had been passing for three years because its example happened to put the awkward value first.',
          'Four further checks were examined and deliberately left alone, because each turned out not to be testable rather than merely untested. Two can never be reached at all: one guards against a value a fixed table can never produce, the other against an input that is rejected earlier. Two more are redundant: a later check already rejects everything the earlier one would have caught. Writing a test for any of the four would have produced a test that passes for a reason unrelated to what its name says \u2014 which is precisely the problem this release removes, not one to add more of.',
          'Tests only. No functional, data, or interface changes.',
        ],
      },
    ],
  },
  {
    version: '0.18.30',
    date: '2026-08-23',
    sections: [
      {
        title: 'Internal — a measurement of how hard the code is to follow, and a baseline',
        items: [
          'A new check measures cognitive complexity \u2014 roughly, how much you have to hold in your head to follow a function. It counts nesting, branching and jumps in control flow rather than length, so a long but straightforward function scores low and a short tangled one scores high. Nineteen functions are currently above the threshold, scoring between 16 and 41, across twelve files.',
          'This adds a measurement, not a fix. Nothing in the app was changed in response to it, and nothing about how the app works, looks, or stores data changes.',
          'The nineteen are not a list of defects and none is being fixed here. A high score marks a function that is hard to hold in your head; whether that is worth changing is a separate judgement made one function at a time, and sometimes the answer is no. A sister project finished similar work with three still standing, each with its reason recorded beside it. Zero was never the target.',
          'A second tool was added alongside it. It reports the score of every function in a file rather than only the ones over the line, and \u2014 given a range of lines \u2014 reports what that block would score if it were pulled out into its own function. That lets a proposed restructuring be costed before anything moves. The check on its own can only report failures, so it cannot answer either question.',
          'The release check now holds the total steady, and it fails in both directions: adding a finding fails it, and so does removing one without updating the recorded number. The second half is deliberate \u2014 a restructuring that shifts complexity from one function into another rather than reducing it would otherwise slip through unnoticed.',
          'One rule was switched on, not the plugin\u2019s full set of roughly four hundred. A sister project measured both on the same day: ten findings from this rule alone against a hundred and three from the wider set, of which about a fifth were simply wrong for that codebase. The two totals are not comparable, so which one was chosen is written into the configuration where a reader will find it.',
          'None of the nineteen is in a test file, although the check covers all thirty-nine of them with no exclusion anywhere. The twenty-three pre-existing advisories were also entirely outside the tests, so this is a clean answer rather than a coincidence.',
          'Development tooling only. No functional, data, or interface changes.',
        ],
      },
    ],
  },
  {
    version: '0.18.29',
    date: '2026-08-23',
    sections: [
      {
        title: 'Maintenance — the last known security advisory is closed, and every dependency is now pinned',
        items: [
          'The fourteenth and last security advisory is closed. The app now reports zero known advisories, down from fourteen at the start of this work. Nothing about how the app works, looks, or stores data changes.',
          'Closing it needed a small update to the build tool, which widened the range of a supporting library it accepts \u2014 the tool\u2019s own statement that the newer line works, which is why no major version change was involved. The version taken was published in June and had already passed the 60-day settling period this project uses. A newer one clears the same advisory but is two weeks old; taking the oldest version that escapes is what made this the one fix in the whole effort that needed no exception.',
          'Every dependency is now pinned to an exact version. Six were declared loosely \u2014 "this version or anything newer that is compatible" \u2014 which meant a fresh install could quietly pick up a release nobody had looked at. One had already drifted three releases that way. All six are now fixed to the version that was already in use, so installs are repeatable and any future change has to be written down.',
          'None of the six was advanced to a newer release. Each was checked separately: four are already the newest available, one has a newer release that is barely a month old and has not settled, and two have newer major versions that are out of scope for this pass. Closing the drift and moving forward are different questions, and the answer to the second was "nothing, this time."',
          'A heading in one of the project\u2019s configuration files described five entries as something they were not. Only one of the five does what the heading claimed; two could never match anything, and two were left over from an older mechanism. The two dead entries were removed and the two misfiled ones were moved to where they belong rather than deleted, because an unused entry of this kind costs nothing while a wrongly removed one can put a generated file into a public repository.',
          'A new check keeps the explanations attached to their dependency pins. Those pins live in a file format that allows no comments, so the reasons sit in a neighbouring block \u2014 which creates a fresh way to go quietly wrong: a reason describing a pin that no longer exists, or a pin with nothing explaining it. Either would look right on the day it stopped being true. The build now refuses both, and each part of the check was verified by breaking it deliberately.',
          'Dependency and tooling maintenance only. No functional, data, or interface changes.',
        ],
      },
    ],
  },
  {
    version: '0.18.28',
    date: '2026-08-23',
    sections: [
      {
        title: 'Security — thirteen of fourteen known advisories closed',
        items: [
          'Thirteen security advisories are closed across five supporting libraries. None of them is a library this app depends on directly \u2014 all sit further down the chain, at a single place each \u2014 and none needed a major version change. Nothing about how the app works, looks, or stores data changes.',
          'The count above is of advisories, not libraries. Six libraries were flagged, carrying fourteen separate advisories between them; one library alone accounted for five. Reporting the number of libraries would have said "six down to one" and hidden that.',
          'A safeguard added in June had quietly stopped being one. It forced a supporting library above a then-critical advisory, and did exactly that on the day it was written. A later advisory was published covering a wider span of versions \u2014 wide enough to include the one the safeguard had settled on. Nothing failed and nothing reported it: the safeguard sat in the project file looking like the thing that had handled the problem, while pointing at a version inside the range it existed to escape. It has been raised, and it now carries a written note naming the advisory, because the version was never what moved \u2014 the advisory was.',
          'A second safeguard, added at the same time for the same reason, turned out to be doing nothing. It was tested both ways: with it and without it, a from-scratch install produces the identical version and reports no advisory. It has been kept rather than removed \u2014 removing it has no measurable benefit and a risk nobody has measured \u2014 and it now says plainly, in writing, that it is not currently doing work.',
          'All five updates are newer than the 60-day settling period this project normally requires, and for each one it was checked whether any settled version would also have cleared the advisory. None would. That is not bad luck: these advisories are recent, so the first version fixing each is necessarily recent too. A security fix is unsettled at the moment it matters. Security takes precedence and the exceptions are written down rather than passed over.',
          'Where more than one fixed version existed, the oldest was taken rather than the newest. One library had four versions that escape its advisory; the automatic tool picks the newest, at sixteen days old. This release takes the oldest that escapes, at twenty-nine days \u2014 the same advisories cleared, with nearly twice the settling time behind it.',
          'The fourteenth advisory is deliberately left for the next release. Clearing it needs a small update to the build tool, which today is a few hours short of the 60-day line. That advisory is low severity, affects only the development server, and only on Windows, which nobody develops this project on \u2014 so waiting a day clears it with nothing unsettled at all, rather than adding a sixth exception to the list.',
          'Security only. No functional, data, or interface changes.',
        ],
      },
    ],
  },
  {
    version: '0.18.27',
    date: '2026-08-23',
    sections: [
      {
        title: 'Internal — the coverage measurement now counts every file, and last release\u2019s figures are corrected',
        items: [
          'The measurement added last release only looked at files the tests actually opened. A file no test ever touches was missing from the list entirely rather than shown with a score of zero — and those two look the same to a person reading a table while being quite different to anything reading it automatically. The setting that changes this is now switched on. The list goes from 47 files to 83, of which 36 are newly included: 34 scoring zero, and two that contain nothing that runs.',
          'Last release\u2019s note gave the wrong numbers, and this note carries the corrected pair. It said 34 of the project\u2019s 81 files were missing from the list. The right figures are 36 of 83, from a tracked total of 84 — the extra file being a single line that describes types and produces nothing that could ever be measured.',
          'The cause is worth writing down because it will happen again. The file count came from a pattern that quietly skips anything sitting at the very top of the source folder, which here meant three files including the application itself and the file that starts it. Both halves of the published sentence came from that same faulty count, so they agreed with one another and the total looked right. All three skipped files were also missing from the measurement, so the subtraction still balanced. An error that agrees with itself is the kind that survives being checked.',
          'The corrected figures can be checked rather than taken on trust: 36 plus 47 makes 83, and 83 is the number anyone gets by running the measurement. The old pair could not be checked that way, and that — not the size of the mistake — is what makes the new one better. Last release\u2019s note is deliberately left as it was written, because it records what was believed at the time.',
          'The headline percentage fell from about seventy per cent to about fifty-one, and that fall is the point. No test changed and nothing got worse; thirty-six files that were previously invisible are now counted, most of them untested. A figure that had stayed the same would have meant the change did nothing.',
          'Two cautions for anyone reading these numbers later. The printed table is an abbreviated view — it leaves out every file scoring full marks, and it shortens long file names from the left — so counting its rows gives 71 where the real answer is 83; read the figures from the data file instead. And whether the browsable report is switched on changes what the data file says about the two files that contain nothing to measure. That was isolated with four separate runs. Two measurements are only comparable if the same set of reports was switched on for both.',
          'Development and release tooling only. No functional, data, or interface changes.',
        ],
      },
    ],
  },
  {
    version: '0.18.26',
    date: '2026-08-23',
    sections: [
      {
        title: 'Internal — how much of the app the tests actually reach can now be measured',
        items: [
          'Until this release there was no way to find out how much of this app its tests actually exercise. The tool that measures it was never installed, and — unusually — nothing said so. The test runner treats that tool as optional, so no command failed and no warning appeared. The gap was silent rather than noisy, which is why it lasted. Both are now in place, and a single command reports the answer.',
          'The first measurement: the tests reach about seventy per cent of the app\u2019s code. Forty-seven files are reported on. Thirty-four more are not reported at all, because a file no test ever loads does not appear in the list rather than appearing with a score of zero — and five further files do appear with a score of zero. Those last two groups look the same on a printed page and are not the same thing, so the setting that would have merged them has deliberately been left alone for now.',
          'The measuring tool is held to the exact version the test runner asks for, rather than the newest one available. The runner does not request a minimum here; it names one version. A mismatched pair is the thing that goes wrong, so the pair is pinned.',
          'The report this produces is written into a new folder each time it runs. Two protections were added for it in the same change. The first keeps that folder out of the published repository — this project\u2019s source is public, and a generated folder that nobody had told version control to ignore was one routine command away from being published. The second stops the folder from breaking the release check.',
          'The second of those was already broken, not merely at risk. The report writer quietly adds a line to the top of three of its own files as it writes them — a line that switches off code-style checking. That line is not in those files as they are distributed, so looking at the installed tool does not reveal it. The release check counts reported style issues against an agreed figure, and those three extra lines pushed the count from twenty-three to twenty-six, which fails the check with a message blaming new problems and never mentioning coverage. Measured both ways to confirm: twenty-six without the fix, exactly twenty-three with it.',
          'A comment in the ignore file was also corrected. It said the project had no README, which stopped being true in June. That is not tidying: while this change was being prepared, the stale comment was read as evidence and produced a wrong conclusion that had to be caught and undone.',
          'Development and release tooling only. No functional, data, or interface changes.',
        ],
      },
    ],
  },
  {
    version: '0.18.25',
    date: '2026-08-22',
    sections: [
      {
        title: 'Internal — the release-checking script no longer says there is no automated checking',
        items: [
          'The script that checks a release before it ships is deliberately the same file in all nine SPERT® Suite projects. The note at the top of it said there was no automated checking anywhere in the suite — that a green tick on a proposed change meant only that a preview copy had been built, and that nothing ran the tests. That has not been true since the script existed. Automated checking runs on every one of the nine projects, on every proposed change and on every merge, and what it runs is this very script.',
          'The statement did not go out of date — it was untrue on the day it was written. The same set of edits that added the script also switched the automated checking on, so the file contradicted a change sitting beside it. That distinction decides the remedy: a statement that decays can be helped by writing down when it was made; a statement that was never true cannot.',
          'Two explanations were added while the file was open. The first records that automated checking and a check run by hand catch different things, so neither is sufficient alone. The second explains how the code-style step is judged — and this project is the reason it had to be written carefully. That step compares the number of reported issues against an agreed figure instead of reading pass or fail. In most projects the step reports failure at that figure, so reading pass-or-fail would be too strict; in this one it reports success, because all twenty-three are advisories rather than errors, so reading pass-or-fail would be too lenient and would let new issues through unnoticed. An earlier draft stated only the first reason, which would have put the opposite of this project’s own recorded rationale into this project’s own file.',
          'Development and release tooling only. No functional, data, or interface changes.',
        ],
      },
    ],
  },
  {
    version: '0.18.24',
    date: '2026-08-20',
    sections: [
      {
        title: 'Internal — a safeguard against a future change breaking saving',
        items: [
          'Decisions saved to the cloud are accepted only if every field they carry appears on a fixed list the server checks. Adding a new piece of information to a decision without also adding it to that list would have compiled cleanly, passed every existing check, and then failed for everyone the moment it shipped. The build now refuses to compile that mistake, and names the field responsible so it can be fixed in seconds rather than diagnosed from a server error.',
          'Nothing changes for a user today. No bug was fixed here — the app and the server agree on every field they exchange, and did before this release. The safeguard exists so they cannot quietly stop agreeing later.',
        ],
      },
    ],
  },
  {
    version: '0.18.23',
    date: '2026-08-19',
    sections: [
      {
        title: 'Changed — Microsoft sign-in now requires a work or school account',
        items: [
          'Personal Microsoft accounts — outlook.com, hotmail.com, live.com — are no longer accepted, and are refused at the sign-in screen before any password is entered. Microsoft itself enforces this, not the app. The change was made for institutions evaluating the Suite, who reasonably expect “sign in with Microsoft” to mean an organisational account rather than any account at all.',
          'Nothing changes for personal use — sign in with Google instead. Google still accepts personal accounts, so anyone can still enable cloud storage. The Settings page now says so, rather than letting you choose Microsoft and discover the restriction from an error message.',
        ],
      },
    ],
  },
  {
    version: '0.18.22',
    date: '2026-08-19',
    sections: [
      {
        title: 'Changed — four security headers this app was not sending',
        items: [
          'Security headers only. Nothing in the app itself changed — it behaves identically to v0.18.21.',
          'The app now returns X-Content-Type-Options, X-Frame-Options, Referrer-Policy and Permissions-Policy on every response. A live check across the SPERT® Suite found this app was the only one of eight serving none of them; the other seven already did, so this brings it into line rather than introducing anything new.',
          'X-Frame-Options is the one that mattered. Without it there was nothing stopping this app from being loaded invisibly inside a frame on another site, where a visitor could be induced to click controls they cannot see. It is set to DENY, matching six of the other seven apps.',
        ],
      },
    ],
  },
  {
    version: '0.18.21',
    date: '2026-08-02',
    sections: [
      {
        title: 'Changed — the licence gains two conditions, and one that asked too much was rewritten',
        items: [
          'Licensing only. Nothing in the app itself changed — it behaves identically to v0.18.20.',
          'The conditions attached to this project’s licence now number six rather than four, and each follows the wording of the standard licence itself rather than paraphrasing it. What the licence permits is unchanged: anyone may still use, study, modify and share this software freely. The wording matters because the standard licence lets whoever receives the software delete any added condition that strays outside the short list it allows.',
          'Two conditions are new. The author’s name may not be used to endorse or promote a product built from this software without permission — the project’s trademarks are protected whether the licence mentions them or not, but a personal name has no such protection. And anyone who resells this software with a warranty or support contract of their own covers any liability those promises impose on the original author.',
          'The condition covering on-screen credit was rewritten. It used to require any modified version with a user interface to display a notice; the standard licence permits requiring that existing notices be preserved, not that new ones be created. It now requires that where a modified version already shows legal notices, the original author’s name is kept among them.',
          'Two smaller changes: a modified version may no longer misrepresent where this software came from, and the trademark condition now says plainly that naming this project to describe honestly what a fork was derived from is not itself prohibited, provided it does not suggest this project endorses the result.',
        ],
      },
    ],
  },
  {
    version: '0.18.20',
    date: '2026-07-31',
    sections: [
      {
        title: 'Fixed — the version shown in the footer was wrong',
        items: [
          'The version number at the bottom of every page had been stuck at 0.18.11 since June 26, through eight releases. It was written into the page by hand rather than read from anywhere, and the hand-updating stopped. Anyone who compared it against the version on this page saw two different numbers; this page was the correct one.',
          'The footer now takes its version from this changelog, which is where the About page and this page already take theirs. There is one number to keep right instead of two, and an automated check refuses a release if the footer ever stops agreeing with it.',
          'Nothing else changed, and nothing you have saved or exported is affected. The version recorded inside exported decisions is kept separately and was correct.',
        ],
      },
    ],
  },
  {
    version: '0.18.19',
    date: '2026-07-31',
    sections: [
      {
        title: 'Changed — copyright and licence notices',
        items: [
          'Nothing in the app changed. It behaves exactly as it did in 0.18.18, and no decision, export or setting is affected.',
          'Every file of source code in this project now carries the copyright and licence notice that the rest of the SPERT® Suite has carried since March. 118 files were missing it, and only five already had one. This project was not skipped on purpose — it did not exist yet when the notices were added everywhere else, and was created four weeks later.',
          'The notice matters because the licence this software is released under adds four extra terms, and the licence requires each source file to say where those terms can be read. A file with no notice points a recipient nowhere.',
          'A new automated check now refuses a release if any source file is missing the notice, including files that have not yet been committed. Every way it could fail was deliberately triggered and confirmed to be caught before it was trusted.',
        ],
      },
    ],
  },
  {
    version: '0.18.18',
    date: '2026-07-31',
    sections: [
      {
        title: 'Changed — the release checks now cover this page',
        items: [
          'Nothing in the app changed. It behaves exactly as it did in 0.18.17, and no decision, export or setting is affected.',
          'The version number shown throughout SPERT AHP is taken from the newest entry on this page, so if an entry were ever missed, the app would display the wrong version. The release checks now verify that this page carries an entry for the version being released, and refuse the release if it does not.',
        ],
      },
    ],
  },
  {
    version: '0.18.17',
    date: '2026-07-31',
    sections: [
      {
        title: 'Changed — release checks now use this project’s own Node version',
        items: [
          'Nothing in the app changed. It behaves exactly as it did in 0.18.16, and no decision, export or setting is affected.',
          'The automated checks that run before a release now read the version of Node.js this project pins, from the file kept alongside the source, rather than a version written separately into the checks themselves. The two were free to disagree with each other.',
        ],
      },
    ],
  },
  {
    version: '0.18.16',
    date: '2026-07-29',
    sections: [
      {
        title: 'Fixed — exported decisions recorded the wrong app version',
        items: [
          'Every decision you export carries a note of which version of SPERT AHP produced it. That note had been stuck at 0.12.1 since early May, so exports made over the last few months name a much older release than the one that actually created them.',
          'Nothing inside the exported decision was affected — the criteria, alternatives, judgements and results were always correct and always imported correctly. Only the version note was wrong.',
          'Exports made from this release onward record the correct version. Files you exported earlier cannot be corrected after the fact; if the version note matters for a record you keep, re-export the decision.',
        ],
      },
      {
        title: 'Fixed — a release was missing from the changelog file',
        items: [
          'Version 0.13.0 appeared in this in-app changelog but had never been added to the changelog file kept in the code repository, which skipped straight from 0.13.1 to 0.12.2. The missing entry has been restored, and the two are now checked against each other automatically.',
        ],
      },
      {
        title: 'Internal — release checks',
        items: [
          'Added an automated release gate that runs the full test suite, the linter and a production build before anything ships, and checks that every place the version number appears agrees with every other place. It runs both on demand and automatically on every proposed change.',
          'This is what found the export version problem above.',
        ],
      },
    ],
  },
  {
    version: '0.18.15',
    date: '2026-07-29',
    sections: [
      {
        title: 'Changed \u2014 the license now reserves the SPERT\u00ae brand',
        items: [
          'The license file has always required that the original author be credited, but it said nothing about the brand name itself \u2014 which left room to read the licence\u2019s freedom to copy and modify the code as carrying the name along with it. That was never the intent.',
          'Two clauses were added. The first names "SPERT", "Statistical PERT" and "Estimation Made Easy" as registered trademarks and "GanttApp" and "MyScrumBudget" as common-law trademarks, and grants no right to use any of them \u2014 alone, combined with other words, or as a logo. The second requires anyone who modifies the app to release it under a different name.',
          'The effect is that the code is still free to take, change and share, credit to the original author still has to travel with it, and the brand does not. The GNU GPL v3 text itself is unchanged.',
          'Two errors in this repository\u2019s copy were corrected at the same time: the heading carried the retired "Statistical PERT\u00ae Software Suite" name instead of "SPERT\u00ae Suite", and the additional terms were an older, weaker wording that left out both the ban on replacing the author\u2019s name with someone else\u2019s and the requirement that the credit appear somewhere visible in the interface.',
          'Nothing in the app itself changed.',
        ],
      },
    ],
  },
  {
    version: '0.18.14',
    date: '2026-07-29',
    sections: [
      {
        title: 'Fixed \u2014 collaborators showed an internal account ID',
        items: [
          'When someone was added to a model through an emailed invitation, the collaborator list could show a short string of random-looking characters instead of their name. This happened whenever that person had used another SPERT\u00ae Suite app but had never personally signed into SPERT AHP.',
          'The collaborator list now falls back to the shared suite-wide profile, so the name or email address appears immediately \u2014 including for collaborators added before this release. Nothing needs to be re-invited and no action is required.',
        ],
      },
    ],
  },
  {
    version: '0.18.13',
    date: '2026-07-26',
    sections: [
      {
        title: 'Internal — repository maintenance',
        items: [
          'Repository housekeeping only. No functional, data, or interface changes — SPERT AHP behaves identically to the previous release. A file describing how Firestore security rules are deployed was removed from the source repository; those rules live in the Firebase Console and are unchanged, and the file was never part of the app you run.',
        ],
      },
    ],
  },
  {
    version: '0.18.11',
    date: '2026-06-26',
    sections: [
      {
        title: 'Internal — tooling',
        items: [
          'Upgraded ESLint 9.39.4 → 10.2.1 to match the suite standard (SPERT Story Map): @eslint/js 10.0.1, eslint-plugin-react-hooks 7.1.1 (adds the ESLint 10 peer), globals 17.5.0. typescript-eslint stays pinned at 8.62.0 for TypeScript 6 support (Story Map’s 8.59.0 would regress it). ESLint 10 requires Node ≥20.19/22.13/24, unlocked by the Node 24 runtime adopted in v0.18.10.',
          'Set react-hooks/refs to "warn": react-hooks 7.1’s compiler-based rule taints hook return values that bundle a ref (useImportState returns fileInputRef alongside phase/importError) and false-flags ordinary member access during render. Downgraded to a warning to match set-state-in-effect; the lint gate fails on errors only.',
          'Added one targeted no-useless-assignment suppression in useImportState.ts where a variable initializer is required for TypeScript definite-assignment but ESLint 10’s flow analysis flags it as useless. The stricter react-hooks 7.1.1 recommended set raised the non-blocking warning count from 11 to 23 (all pre-existing patterns). Build clean, all 347 tests pass.',
        ],
      },
    ],
  },
  {
    version: '0.18.10',
    date: '2026-06-26',
    sections: [
      {
        title: 'Infrastructure — runtime',
        items: [
          'Adopted Node.js 24 LTS: added engines.node "24.x" (previously unset) and created .nvmrc pinned to 24, aligning the declared and local dev runtime with the Node 24 LTS line. No application logic or dependencies changed; @types/node is left at its transitively-resolved version. Vercel’s build runtime is set to 24.x in the dashboard in coordination with this release.',
        ],
      },
    ],
  },
  {
    version: '0.18.9',
    date: '2026-06-23',
    sections: [
      {
        title: 'Internal — tooling',
        items: [
          'Added ESLint 9.39.4 (flat config) with the suite-standard lean base — typescript-eslint 8.62.0, eslint-plugin-react-hooks 7.0.1, eslint-plugin-react-refresh 0.5.2, globals 17.4.0 — bringing AHP in line with the other SPERT Vite apps (SSV, Scheduler, Story Map). New "lint": "eslint ." script (errors-fail-only); dist/ and .claude/** (Claude Code worktrees) are ignored. The DevOps dashboard ESLint badge now reads 9.39.4 for AHP.',
          'typescript-eslint pinned to 8.62.0 for TypeScript 6 support. The suite-wide 8.57.x caps its TypeScript peer at <6.0.0, but AHP runs TS 6.0.3; 8.58.0 widened the peer to <6.1.0, so 8.62.0 (latest in the 8.x line) installs cleanly without --force.',
          'Cleared 14 lint errors from the first run: removed two inert @next/next/no-img-element disable comments in AppHeader (AHP is Vite, not Next); suppressed react-hooks/refs on the intentional latest-value ref syncs in useMatrix and useBufferedField (a documented stable-mutable-ref pattern); suppressed one react-hooks/purity false positive on a click-handler Date.now() in ThresholdConfigurator; replaced five as-any casts in LocalStorageAdapter.test.ts with typed casts; and removed a dead test helper plus a now-unused exhaustive-deps directive. All 347 tests pass.',
          '11 React Hooks / React Refresh warnings (only-export-components, set-state-in-effect, exhaustive-deps) are left visible and non-blocking — the lint gate fails on errors only.',
        ],
      },
    ],
  },
  {
    version: '0.18.8',
    date: '2026-06-23',
    sections: [
      {
        title: 'Internal — framework',
        items: [
          'React upgraded 18.3.1 → 19.2.5 (major) — react, react-dom, react-is, @types/react (19.2.14) and @types/react-dom (19.2.3) moved atomically. The app already uses the createRoot API and has no legacy call sites (no ReactDOM.render, findDOMNode, string refs, or no-argument useRef), so the only source change was a single type annotation — useImportState\'s fileInputRef return type now includes | null to match React 19\'s RefObject<T | null> from useRef(null). tsc -b and all 347 tests pass. @vitejs/plugin-react 4.7.0 imposes no React peer constraint, and @testing-library/react 16.3.2 already supports React 19.',
        ],
      },
    ],
  },
  {
    version: '0.18.7',
    date: '2026-06-23',
    sections: [
      {
        title: 'Internal — charting',
        items: [
          'recharts upgraded 2.15.4 → 3.8.1 (major). recharts 3 drops its bundled lodash dependency (replaced internally by es-toolkit), removing that transitive lineage entirely — the lodash advisory itself was already cleared via a patched release in v0.18.3. Adds a redux-toolkit-based internal state layer (no app-level Provider needed); the production bundle is slightly smaller (1,190 → 1,157 kB).',
          'Added react-is 18.3.1 as a direct dependency to satisfy recharts 3\'s required react-is peer (matches the React 18 runtime).',
          'SensitivityChart Tooltip formatter and labelFormatter coerced via Number(v): recharts 3 widens the Tooltip formatter value to ValueType and the label to ReactNode, so the two callbacks now coerce for type compatibility (display behavior unchanged). Both charts verified rendering under recharts 3.',
        ],
      },
    ],
  },
  {
    version: '0.18.6',
    date: '2026-06-23',
    sections: [
      {
        title: 'Internal — tooling',
        items: [
          'TypeScript upgraded 5.9.3 → 6.0.3 (major; dev/build-time tool, no runtime footprint). tsc -b builds clean with the existing strict tsconfig — the single side-effect CSS import in main.tsx is covered by Vite ambient client types, so no tsconfig changes or new ambient declarations were needed. All 347 tests pass.',
        ],
      },
    ],
  },
  {
    version: '0.18.5',
    date: '2026-06-23',
    sections: [
      {
        title: 'Internal — test environment',
        items: [
          'jsdom upgraded 25.0.1 → 29.1.0 (major; test-only devDependency). jsdom 29 replaces its bundled ws and form-data dependencies with undici, removing that transitive lineage entirely — the ws/form-data advisories themselves were already cleared via patched releases in v0.18.3. All 30 test files / 347 cases pass unchanged under jsdom 29.',
        ],
      },
    ],
  },
  {
    version: '0.18.4',
    date: '2026-06-23',
    sections: [
      {
        title: 'Internal — maintenance',
        items: [
          'Version tag for vitest 4.1.4 → 4.1.5 and tailwindcss / @tailwindcss/vite 4.2.2 → 4.2.4. These versions were pre-pinned and installed in v0.18.3 ahead of the lockfile regen; this release is their canonical changelog attribution. No dependency or application code changed since v0.18.3.',
        ],
      },
    ],
  },
  {
    version: '0.18.3',
    date: '2026-06-23',
    sections: [
      {
        title: 'Dependency security',
        items: [
          'Firebase upgraded 12.11.0 → 12.12.1 (advances @firebase/firestore 4.13.0 → 4.14.0).',
          'Added npm overrides (protobufjs ≥7.6.3, @grpc/grpc-js ~1.9.16) plus a full lockfile regen — clears the critical protobuf.js advisory cluster, the high @grpc/grpc-js crash advisories, and the moderate @protobufjs/utf8 overlong-UTF-8 advisory from the Firestore subtree. @protobufjs/utf8 is not overridden directly: protobuf.js 7.6.4 depends on the patched @protobufjs/utf8 ^1.1.1, so the override pulls it through the dependency chain.',
          'The full lockfile regen also refreshed the remaining caret-ranged transitive advisories — postcss, @babel/core, ws, form-data, and lodash — to patched releases. npm audit now reports a single low-severity advisory: esbuild (Windows dev-server only), which remains chronically deferred.',
        ],
      },
      {
        title: 'Internal — dependency pre-pins',
        items: [
          'Pre-pinned vitest 4.1.4 → 4.1.5, tailwindcss 4.2.2 → 4.2.4, @tailwindcss/vite 4.2.2 → 4.2.4 ahead of the lockfile regen (versions tagged in v0.18.4).',
          'Pinned @types/react to exact 18.3.28 (ceiling-pin; stays on React 18 types until the React 19 upgrade).',
        ],
      },
    ],
  },
  {
    version: '0.18.2',
    date: '2026-06-23',
    sections: [
      {
        title: 'Dependency security',
        items: [
          'Vite upgraded 7.3.2 → 7.3.5 — clears the two Windows-only, dev-server-only advisories deferred in v0.18.1: GHSA-v6wh-96g9-6wx3 (launch-editor NTLMv2 hash disclosure via UNC paths) and GHSA-fx2h-pf6j-xcff (server.fs.deny bypass on Windows alternate paths), both affecting Vite 7.0.0–7.3.3. Vite 7.3.4 was never published, so 7.3.5 is the first patched 7.x release. @vitejs/plugin-react stays at 4.7.0; Vite 8 (Rolldown major) is deferred.',
        ],
      },
    ],
  },
  {
    version: '0.18.1',
    date: '2026-06-19',
    sections: [
      {
        title: 'Dependency security',
        items: [
          'Vitest upgraded 2.1.9 → 4.1.4. The two-major jump (2→3→4) cleared with zero test changes — all 30 test files and 347 cases pass unchanged, including the heavy mock and fake-timer usage (vi.fn, vi.mock, vi.spyOn, vi.useFakeTimers, mockRestore) that the v3 behavioral changes (stricter toEqual/toThrow error equality, mockReset() restoring original implementations, fake timers mocking performance.now()) could have affected',
          'Vite upgraded 6.4.1 → 7.3.2. The production build was re-verified clean on Vite 7. @vitejs/plugin-react was deliberately held at 4.7.0, which already supports Vite 7 — its 6.x line was avoided because it requires Vite 8',
          'Duplicate Vite 5.4.21 removed from the dependency tree. Vitest 2\'s vite-node pulled a second Vite into the tree; Vitest 4\'s module runner eliminates it, leaving a single deduplicated Vite',
          'Two Windows-only Vite advisories remain deferred to a follow-up around July 31, 2026. GHSA-v6wh-96g9-6wx3 (launch-editor NTLMv2 hash disclosure via UNC paths) and GHSA-fx2h-pf6j-xcff (server.fs.deny bypass on Windows alternate paths) affect Vite 7.0.0-7.3.3. Both are dev-only (Vite is never shipped to production) and Windows-only; closing them requires moving past 7.3.3, which is scheduled separately',
        ],
      },
      {
        title: 'Internal — test infrastructure',
        items: [
          'vitest.config.ts now excludes dist/ and .claude/ from test discovery. Vitest 4 relaxed its default excludes to only node_modules and .git; without an explicit exclude the runner picked up build output and local Claude Code worktree copies under .claude/, inflating the suite from 30 files to 126. No test logic changed',
        ],
      },
    ],
  },
  {
    version: '0.18.0',
    date: '2026-05-25',
    sections: [
      {
        title: 'Cloud storage correctness',
        items: [
          'External sign-out (token expiry, server-side revoke, account deletion in another tab) now runs the same cleanup pipeline as user-initiated sign-out. Previously, the onAuthStateChanged(null) branch only set user to null, leaving PII in localStorage and the storage mode at cloud',
          'Cloud sign-out clears local project data (ahp/modelIndex, ahp/models/*). Previously a prior cloud user\'s decisions remained and could appear in the next user\'s migration prompt',
          'Comparison saves flush immediately on pagehide and beforeunload. Previously a user who closed the tab within the debounce window would silently lose their last judgment',
          'Comparison save debounce is cancelled explicitly via the sign-out registry, ensuring cancellation regardless of whether ComparisonPanel is currently mounted',
          'Matrix comparisons update in real time when a collaborator\'s snapshot arrives. Previously useMatrix seeded state once on mount and ignored all subsequent prop changes',
          'Title, goal, and item-label inputs are protected by a focus guard — a collaborator\'s snapshot no longer clobbers text the user is actively typing. Navigating to another tab while a field is focused commits the in-progress draft. Enter now commits item labels without requiring blur',
          'When a collaborator\'s access is revoked while they have a decision open, the snapshot error now triggers a state reset removing the revoked model from memory',
          'Synthesis computation checks a generation counter after each storage await — a sign-out during a multi-voter synthesis no longer writes to a revoked session',
          'updateModel and updateStructure now include schemaVersion in every Firestore update payload',
        ],
      },
    ],
  },
  {
    version: '0.17.0',
    date: '2026-05-24',
    sections: [
      {
        title: 'Import — cloud hydration gate',
        items: [
          'Cloud decisions gate the Import button until the initial Firestore fetch completes. Previously, signing in and immediately picking an import file would call listModels() against an empty local cache, silently missing all conflicts. The Import button is now disabled with an amber hint banner ("Cloud decisions are still loading…") until the first listModels() resolves. Mid-preview storage changes continue to abort the import flow as before',
          'Confirm Import and Confirm Replace now check cloud readiness as a secondary guard. If the cloud fetch has not completed when the user confirms, they receive a clear error rather than proceeding against a stale conflict map',
          'StorageContext resets cloud-readiness atomically with the adapter swap. No render window exists between "new adapter" and "Import button disabled"',
        ],
      },
      {
        title: 'Import — defensive hardening',
        items: [
          'runApply exit logic moved to a finally block. applyActiveRef and runApplyEnteredRef resets are now guaranteed to run regardless of throw',
          'aria-busy added to Import button during applying and parsing phases so screen readers announce in-progress states correctly',
          'Result and error banners use role="alert" (errors) or role="status" (success) so screen readers announce import outcomes without requiring navigation to the banner',
        ],
      },
      {
        title: 'Import — legacy cleanup',
        items: [
          'importModel() removed. The pre-v0.16.0 single-shot import function had no production callers after v0.16.0\'s applyImportMerge introduction. Its 9 tests were migrated to the current parseAndClassifyImport + buildBundleFromEnvelope path or deleted where already covered. Consolidates the duplicated UID-remap logic behind buildBundleFromEnvelope',
        ],
      },
    ],
  },
  {
    version: '0.16.1',
    date: '2026-05-24',
    sections: [
      {
        title: 'About page',
        items: [
          'Renamed the QRG download button from "Open PDF" to "Open Quick Reference Guide (PDF)" to match the canonical label used across all SPERT® Suite apps.',
        ],
      },
    ],
  },
  {
    version: '0.16.0',
    date: '2026-05-19',
    sections: [
      {
        title: 'Import — Level 4 upgrade',
        items: [
          'Import now handles both single-decision exports and bundle exports (the file produced by Export All). Previously, importing a bundle file produced "Missing required field \'spertAhpExportVersion\'" — bundle files use the distinct top-level field spertAhpBundleVersion. This was a live incompatibility between the Export All and Import buttons',
          'Bundles with invalid envelopes no longer abort the entire import. Each invalid envelope (untitled drafts, oversized payloads, malformed shape) is surfaced as a red row in the preview with a specific error, while valid envelopes can still be imported',
          'In local storage mode, conflict-free single-decision imports complete in one click with no confirmation step. In cloud storage mode, the preview panel is always shown because the cloud model list may not be fully hydrated immediately after sign-in',
          'Per-model conflict detection (ID match and name match) with a preview panel. All conflicts default to skip; the user must affirmatively select add or replace. Replace is only available for decisions you own; when multiple existing decisions share a normalized title, replace is disabled with a tooltip explaining the ambiguity',
          'The Add radio in conflict rows now tooltips: "Creates a new copy of this decision, owned by you. The original is unchanged."',
          'Replace-All confirmation modal. If two selections target the same existing decision, only the first applies (disclosed in the modal). Modal Cancel returns to the preview panel',
          'Replacing a decision preserves cloud sharing (editors and viewers remain members). Collaborators\' prior judgments are not carried over — previous comparisons referenced the old criteria/alternatives. The decision\'s original creation date, authorship, and workspace fingerprint are preserved. The pre-replace edit history is replaced by the imported model\'s provenance',
          'Owner-only replace is enforced both in the UI and inside the Firestore transaction (defense-in-depth: an editor or viewer attempting a replace via direct adapter call will be rejected at the database layer, not just the UI)',
          'File size limits are enforced in UTF-8 bytes (10 MB outer, 900 KB per envelope), matching Firestore\'s actual document limit. The previous character-count check could let non-ASCII payloads exceed the storage limit',
          'Result banner shows per-action counts (added, replaced, skipped, failed) and per-model error reasons. When exactly one decision is written with no errors or skips, the imported decision auto-opens without a banner. All-skip shows the count rather than silently closing',
          'A new "Reading…" phase covers the file-pick window; the Import button is disabled across reading, preview, replace-confirm, and applying',
          'If storage mode changes during an in-flight import (e.g., sign-in triggers a flip), the user is now shown an explicit warning banner rather than the import silently completing against the previous storage',
          'ModelIndexEntry now includes a required role field',
          'StrictMode mount-ref fix in useImportState. Caught during live-UI verification: the isMountedRef cleanup callback used a setup-returns-cleanup pattern that never re-set current=true. Under React.StrictMode dev double-invoke (mount → cleanup → mount), the ref stayed false and setPhase(banner) at runApply exit was silently swallowed — live UI appeared stuck on "Importing…" with no banner even after the write completed. Fixed: setup now explicitly sets current=true. Regression test added',
        ],
      },
      {
        title: 'Known cloud-mode limitation',
        items: [
          'Immediately after sign-in, the cloud model list may not be fully populated. Importing during this window can miss conflicts that exist server-side. Wait a moment after sign-in before importing if you have many shared decisions. A hydration-aware fix is planned for v0.17.0',
        ],
      },
      {
        title: 'Tests',
        items: [
          'New import-utils.test.ts (33 tests) — parseAndClassifyImport, detectAHPImportConflicts, applyImportMerge, conflictMapsEqual, byte-accurate size caps, multi-candidate name match',
          'New FirestoreAdapter.replace.test.ts (9 tests) — runTransaction owner gate, identity-field preservation, fresh response slot creation',
          'New useImportState.test.tsx (12 tests) — phase machine, C1 reentrancy-guard regression, C2 bundle parse-error surfacing, dismiss-banner, cancel-from-replace-confirm',
          'LocalStorageAdapter.test.ts: 5 new tests for replaceModelFromBundle',
          'exportImport.test.ts: 5 new tests for bundle format round-trip and the v0.15.x bundle-rejection regression',
        ],
      },
    ],
  },
  {
    version: '0.15.0',
    date: '2026-05-09',
    sections: [
      {
        title: 'Fixed',
        items: [
          'Cross-user migration disclosure copy. The migration-confirmation panel previously read "You have N local decisions. Upload to cloud?" — ambiguous on a shared browser, where local decisions persist across sign-out and could have been created by a previous user. New copy explicitly discloses that local decisions are device-scoped, not identity-scoped: "This device has N local decisions stored in your browser. Local decisions are not linked to any account — they may have been created by you or by a previous user of this browser. Upload them to your cloud account?" UI-only; no logic change',
          'addCollaborator and updateCollaborator now wrap caller-is-owner runTransactions. Mirrors the v0.14.0 three-guard pattern from removeCollaborator. addCollaborator adds Guard 1: caller-must-be-owner. updateCollaborator adds Guard 1: caller-must-be-owner; Guard 2: target-must-not-be-owner (the owner role is a fixed point). Both guards throw plain Error so SharingSection surfaces err.message directly. The transactional wrapper also eliminates the previous read-modify-write race where two concurrent owner-side adds could each clobber the other’s collaborators[] write',
          'reorderModels now filters caller-supplied orderedIds against actual membership. Previously a malformed or maliciously-constructed list would hit the writeBatch and fail partway as Firestore rules rejected foreign writes. The client-side filter (using the same where(members.{uid}, in, [...]) query as listModels) reduces this to a clean no-op for unauthorized ids',
          'performSignOutWithCleanup now clears the sessionStorage invite token. Previously spert:pendingInviteToken survived sign-out, so the next user on the same tab could see a spurious "you’ve been added" banner driven by the previous user’s invite-link landing. Imports INVITE_SESSION_KEY from captureInviteTokenFromUrl.ts and removeItems inside a try/catch (sessionStorage may be unavailable in private/embedded contexts)',
          'registerSignOutCleanup now returns a deregister handle. The module-level callbacks array previously grew on every remount (StrictMode double-invoke, route reset, error-boundary recovery) and accumulated closures over stale React state. Both production registrations (App.tsx for closeModel, StorageContext.tsx for storage-mode reset) now return the deregister from their useEffect cleanup',
          'ahp/hasUploadedToCloud consolidated behind migration.ts exports. The literal previously appeared as a duplicated const HAS_UPLOADED_KEY in both migration.ts and performSignOutWithCleanup.ts, plus a bare string in StorageSection.tsx. migration.ts now exports HAS_UPLOADED_KEY and a new setHasUploadedFlag() helper; the other two sites import from there. Renaming the key now requires editing one source-of-truth instead of three',
        ],
      },
      {
        title: 'Documented (intentionally not changed)',
        items: [
          'useAHP.saveComparisons non-rollback on storage failure. The optimistic local dispatch is intentionally not rolled back — the SET_ERROR dispatch ("Save failed — you may have been signed out. Reload to continue.") is the user-visible signal, and rolling back would require snapshotting prior response state and reverting on catch. New comment near the optimistic dispatch in useAHP.ts documents the trade-off explicitly',
        ],
      },
      {
        title: 'Tests',
        items: [
          'New performSignOutWithCleanup test asserting INVITE_SESSION_KEY is cleared on sign-out',
          'New signOutCleanupRegistry tests covering the deregister handle: removes only the specified callback, idempotent under double-deregister, does not affect callbacks registered after deregistration',
          'beforeEach in performSignOutWithCleanup.test.ts now clears sessionStorage for hermetic runs',
        ],
      },
      {
        title: 'Out of scope (flagged, not done)',
        items: [
          'No FirestoreAdapter unit tests added for the new transactional guards. The codebase has no FirestoreAdapter test infrastructure; the removeCollaborator precedent (also unguarded by unit tests) is matched. Manual smoke during the verification pass exercises the owner / non-owner / target-is-owner branches',
          'No server-side change. The deployed Firestore rules already enforce owner-only mutations at the database layer; the new app-side guards add UX (clear error messages) and defense-in-depth',
          'checkReturningUserConsent fail-open behavior unchanged — already documented in source',
          'subscribeModel silent permanent-failure surface unchanged — carry-forward from v0.13.1, blocked on the notification provider gap',
          'writeUserProfile per-load writes unchanged — out of scope for this release',
          'No dependency upgrades',
        ],
      },
    ],
  },
  {
    version: '0.14.0',
    date: '2026-05-08',
    sections: [
      {
        title: 'Fixed',
        items: [
          'removeCollaborator now wraps a three-guard runTransaction (Lesson 50). Previously a single getDoc + updateDoc with zero guards. Guard 1: self-removal pre-check fails fast before the transaction. Guard 2: caller-must-be-owner check inside the transaction (defense-in-depth — UI is owner-gated, this catches a gating bypass). Guard 3: target-must-not-be-owner — prevents removing the project owner. Guards throw plain Error and SharingSection.handleRemove surfaces err.message directly. Atomic write preserves prior behavior — prunes embedded collaborators array, drops members[userId], bumps updatedAt; response slot intentionally left intact so a re-added collaborator’s prior judgments are preserved',
          'useInvitationLanding rewritten to match the canonical Story Map 3-state machine (Lessons 7, 27, 59). The hook now has four explicit effects: URL capture (Effect 1), sessionStorage rehydrate (Effect 2), spert:models-changed listener with SESSION_KEY gate (Effect 3), and 30-second grace timer with consume-before-transition (Effect 4). The prior immediate pre_auth → idle on user sign-in is replaced by the 30s timer, giving the claim CF time to resolve (cold start ≈5–15s) before stranding the banner. SESSION_KEY gate prevents a returning user with cached pending invitations from seeing a spurious "you’ve been added" banner on normal sign-in. AHP’s discriminated-union state shape ({tokenId} on pre_auth, {modelNames} on claimed) preserved so InvitationBanner’s render contract is unchanged',
          'Cloud auto-flip on invite-link landing now gates on hasLocalProjects() (Lessons 28, 53). Previously, clicking ?invite= unconditionally called switchMode(‘cloud’), silently orphaning any existing local projects on the device. New StorageAdapter.hasLocalProjects(): Promise<boolean> capability — implemented on both adapters, both reading localStorage[‘ahp/modelIndex’] (local-project presence is mode-independent). Hook Effect 1 wraps switchMode in a fire-and-forget hasLocalProjects check; flip is skipped when the device already has any local projects',
          'parseBulkEmails returns {valid, invalid} with EMAIL_RE validation (Lessons 42, 43). Previously returned string[] with no format validation — invalid-format tokens silently passed through to the CF. The shape change is coupled with SharingSection: nothing valid → no CF call (textarea retained); after the call → textarea clears only when added + invited > 0; invalid-format tokens surface as "Invalid N: …" alongside Added / Invited / Skipped in the existing result summary',
          'SharingSection now renders an explicit error state when the collaborators fetch fails (Lesson 60). Previously a failed model load left ahpState.collaborators empty and the section disappeared silently — users couldn’t tell whether they lacked permission or whether the load broke. Four-state OwnerStatus (loading / owner / not-owner / error) derived from existing ahpState fields with no reducer changes; the error state renders a visible "Couldn’t load sharing details. Refresh the page to try again." alert',
          'Post-send refresh in SharingSection now uses Promise.allSettled instead of sequential awaits (Lesson 64). Previously a loadModel rejection skipped the refreshPending call entirely; either list could be stale but never both updated independently. Per-rejection console.warn surfaces the cause without blocking the other refresh',
          'InvitationBanner restyled to a centered card (Lesson 56). max-w-lg + mx-auto + p-5 + rounded-lg + shadow-sm; dismiss button anchored absolute top-2 right-2 with pr-6 inner content offset so text never runs under it at narrow widths',
        ],
      },
      {
        title: 'Added',
        items: [
          'src/lib/callables.ts — centralized callable wrapper layer with requireFunctions() that throws a meaningful error when Firebase Functions is not configured (Lesson 61). Replaces the five getXxx factory exports + per-site null checks pattern. Each call* wrapper unwraps r.data so callers consume the result directly. Five wrappers: callSendInvitationEmail, callClaimPendingInvitations, callRevokeInvite, callResendInvite, callUpdateInvite',
          'src/lib/captureInviteTokenFromUrl.ts — extracted from useInvitationLanding’s Effect 1 for testability (Lesson 58). Optional enabled override, preserves URL fragment + non-?invite= query params on strip, idempotent. Six unit tests covering happy path, enabled=false, no-?invite=, idempotency, fragment preservation, and other-query preservation',
          'src/lib/profileWrites.ts — extracted from AuthContext’s inline closure (Lesson 62). Two named exports: writeSpertahpProfile and writeSpertsuiteProfile, sharing a single buildPayload() helper. updatedAt placed last in the literal so a future spread cannot overwrite serverTimestamp() (Lesson 29). Seven smoke tests covering field shape, lowercased email, null fallbacks, serverTimestamp positioning, fire-and-forget contract, and cross-collection payload symmetry',
        ],
      },
      {
        title: 'Tests',
        items: [
          '251 passing across 24 test files (was 231 across 22). New: parseBulkEmails partition / all-invalid / malformed cases (3), useInvitationLanding SESSION_KEY gate / 30s grace timer / cleanup-races-claim / hasLocalProjects gate (4), LocalStorageAdapter hasLocalProjects (2), captureInviteTokenFromUrl (6), profileWrites (7). vi.mock(‘../callables’) surface added to performSignOutWithCleanup test as a forward-compat template (Lesson 21)',
        ],
      },
      {
        title: 'Out of scope (flagged, not done)',
        items: [
          'No server-side change. Firestore security rules already block owner self-removal at the database layer; the new app-side guards add UX (clear error messages) and defense-in-depth, not new safety',
          'AHP’s voting model (isVoting / updateInvite) is orthogonal to all changes in this series — verified untouched',
          'No React 19 migration. AHP stays on React 18.3.1; lazy useState initializer (Lesson 66) does not apply',
          'No dependency upgrades',
        ],
      },
    ],
  },
  {
    version: '0.13.3',
    date: '2026-05-03',
    sections: [
      {
        title: 'Fixed',
        items: [
          'Suppressed noisy claimPendingInvitations failed: functions/failed-precondition console error on every page load. AuthContext fired the Cloud Function on every auth resolution; the function rejects with failed-precondition (HTTP 400) whenever the IdP did not stamp email_verified=true on the token (e.g. Microsoft personal MSA accounts: outlook.com / hotmail.com / live.com). claimPendingInvitationsAndNotify now early-returns when firebaseUser.emailVerified is false, skipping the doomed network round-trip and the resulting console.error. Behavior unchanged for Google and Microsoft work/school accounts, which continue to claim pending invitations on sign-in',
        ],
      },
      {
        title: 'Out of scope (flagged, not done)',
        items: [
          'No server-side change. The Cloud Function in spert-landing-page still rejects unverified-email callers with failed-precondition — that defense is correct and stays',
          'No dependency upgrades',
        ],
      },
    ],
  },
  {
    version: '0.13.2',
    date: '2026-05-03',
    sections: [
      {
        title: 'Fixed',
        items: [
          'Every form control now has an id or name attribute. Added semantic camelCase name attributes to 17 inputs/textareas/selects across GlobalSettingsPanel, DecisionPanel, ItemBuilder, ThresholdConfigurator, SharingSection, ManagePanel, PendingInvitesList, DashboardPanel, ConsentModal, and ComparisonInput. Reused name values across visually distinct inputs are documented (itemLabel per SortableItem, newItemLabel across both ItemBuilder instances, pre-existing storage-mode for the radio group) — none coexist inside a real form element',
          'Every visible label is now associated with its input. Added htmlFor + id pairs (generated via React.useId()) on six label/input couples: GlobalSettingsPanel Name + Identifier, DecisionPanel Title + Goal, ThresholdConfigurator Agreement + Mild range sliders. The codebase had zero prior htmlFor usage, so the new pattern is established cleanly',
          'Decorative label in ItemBuilder converted to a div. The group heading "Decision Factors (N)" / "Alternatives (N)" was rendered as a label element despite labelling no specific input — Chrome flagged this as "No label associated with a form field"',
          'aria-label added to controls without visible labels (in passing while touching them for name/id): legacy invite email + role select in SharingSection, per-collaborator role select + voting checkbox, both ItemBuilder add-item inputs and the SortableItem rename input (passed itemLabel prop down so the aria-label reads e.g. "Decision Factor 1 label"), and the ComparisonInput range slider (uses existing mode/itemA/itemB props)',
        ],
      },
      {
        title: 'Out of scope (flagged, not done)',
        items: [
          'No new shared Field/FormField wrapper component. The codebase has none, and per-call-site edits are the lighter touch',
          'App-domain text inputs (decision titles, criterion/alternative names, threshold values, mixed-format identifier hints) deliberately did not get autoComplete — they don\'t collect a personal-data category the browser knows how to autofill',
          'No dependency upgrades',
        ],
      },
    ],
  },
  {
    version: '0.13.1',
    date: '2026-05-03',
    sections: [
      {
        title: 'Fixed',
        items: [
          'onSnapshot listener now logs Firestore stream errors. FirestoreAdapter.subscribeModel previously passed only a success callback, so a transient permission revocation, network failure, or rules-eval rejection on the live model document would terminate the subscription silently with no diagnostic. Added an error callback that logs the Firebase error code and message. No tracking-set cleanup was needed — the single subscription is owned by useAHP\'s useEffect and torn down via React cleanup, not via a Set of active doc IDs',
          'autoComplete props on two form inputs. Added autoComplete="off" to the collaborator-email input in SharingSection (the field collects another user\'s email, so the signer-in\'s saved email should not autofill). Added autoComplete="name" to the Export Attribution name input in GlobalSettingsPanel (the field collects the user\'s own name for export-metadata stamping). All other text inputs in the codebase carry app-domain labels (decision titles, criterion names, alternative names, identifier example-format hints) and are correctly excluded',
        ],
      },
      {
        title: 'Out of scope (flagged, not done)',
        items: [
          'Centralized error-notification surface. A handful of Firestore writes — specifically the fire-and-forget profile updates in AuthContext.writeUserProfile — log failures to console only and never reach the user. Wiring them to a user-visible toast/banner would require introducing a notification provider that does not currently exist anywhere in the app (every other surfaced error is held in component-local React state and rendered as an inline banner). Building one as a side effect of a hardening pass is out of scope; logged for future work',
          'No dependency upgrades',
        ],
      },
    ],
  },
  {
    version: '0.13.0',
    date: '2026-05-02',
    sections: [
      {
        title: 'Changed',
        items: [
          'Tab bar restructured: Dashboard | Decision | Compare | Results | Manage | Settings | About. The old Decisions tab — which shape-shifted between a hub and a workspace depending on whether a model was open — has been split into Dashboard (always-visible hub) and Decision (always-visible workspace). The Project tab has been renamed Manage and still appears only when a decision is open',
          'Dashboard redesigned as a responsive card grid with a + New Decision button in the header, mirroring the MyScrumBudget layout. Untitled drafts render with an italic "Untitled decision" placeholder so they are still browsable and deletable',
          'Title and Goal moved from the Dashboard create-form into editable inputs at the top of the Decision tab. Inputs commit on blur via updateModel; they remain editable at any point in the decision lifecycle (owner discretion — small typos and refinements should not require a new decision)',
          'Project Settings panel renamed to Decision Settings (Manage tab heading). Invitation-banner copy now reads "invited to a SPERT AHP decision" and "added to a shared decision" instead of "project"',
        ],
      },
      {
        title: 'Added',
        items: [
          'Auto-navigation when a decision is opened: clicking + New Decision, clicking a saved-decision card (including the currently-loaded one), or importing a JSON model now jumps the user straight to the Decision tab. Navigation is fired explicitly by DashboardPanel via an onDecisionOpened callback rather than a modelId-transition useEffect, so re-clicking the already-loaded card still navigates instead of silently no-op-ing',
          'Empty-state guidance on Decision tab when no decision is open: "No decision open" heading plus a Go to Dashboard button. The previous bounce-on-empty guard was removed so the user can land on Decision without a model and see this guidance instead of being redirected away',
        ],
      },
      {
        title: 'Internal',
        items: [
          'Deleted ModelSetup.tsx and split it into DashboardPanel.tsx (hub: card grid, create/import/export) and DecisionPanel.tsx (workspace: editable title/goal, tier selector, criteria/alternatives builders). Each new component now has a single responsibility and a smaller surface',
          'Renamed ProjectSettingsPanel.tsx → ManagePanel.tsx and updated its component/interface names to match. Updated the stale "any mounted ModelSetup re-runs listModels" doc-comment in AuthContext to point at DashboardPanel',
          'Simplified the App.tsx auto-advance useEffect from a two-job transition detector (open + close) to a close-only fallback (truthy → null while on a model-scoped tab). Forward navigation is now handled by an explicit callback prop, which is more predictable and easier to reason about',
        ],
      },
    ],
  },
  {
    version: '0.12.2',
    date: '2026-05-02',
    sections: [
      {
        title: 'Fixed',
        items: [
          'Cross-user invitation-roster leak on shared browsers. The Sharing section\'s blue success panel (showing every email in added/invited/failed) was held in component-local React state and survived sign-out, because the component returns null on sign-out without unmounting. The next signer-in who opened a model they own would briefly see the previous user\'s invitation list. Added a useEffect keyed on user?.uid that resets the leakable state whenever the signed-in user changes. Restores the signOutCleanupRegistry invariant established in v0.7.2',
        ],
      },
      {
        title: 'Internal',
        items: [
          'Replaced firestore.rules with a pointer comment and deleted firestore.rules.merged. The checked-in rules file held a stale partial copy of the AHP-specific rules and was missing the entire suite-wide invitation infrastructure (spertsuite_invitations, spertsuite_profiles, spertsuite_rate_limits, spertsuite_notification_throttle). Anyone treating it as the source of truth and paste-replacing it into the Firebase Console would have silently erased the suite-wide rules. The pointer names spert-landing-page/firestore.rules and the Firebase Console as the live source of truth',
          'Documented intentionally-preserved localStorage keys in performSignOutWithCleanup. ahp/sessionUserId and ahp/workspaceId are random browser-scoped opaque identifiers used as _originRef fingerprints by migration.ts; clearing them would break workspace continuity for repeated local→cloud migrations on the same device',
        ],
      },
    ],
  },
  {
    version: '0.12.1',
    date: '2026-05-02',
    sections: [
      {
        title: 'Fixed',
        items: [
          'Toggling voting on a pending invitation now shows accurate error copy. Previously a failure surfaced the resend-flow message ("This invitation has reached its resend limit (5)…"), which never applied to voting updates. New "updateVoting" error context covers permission-denied, failed-precondition, not-found, and rate-limit cases with copy that matches the action',
          'useAHP.loadModel no longer closes over a stale userId. The useCallback dependency array was missing userId, so re-rendering the hook with a new userId (e.g. sign-out + sign-in within the same React tree) left loadModel operating on the old user — most visibly via the response-slot self-heal touching the wrong slot. Brought into alignment with createModel, which already had the correct dep array',
          'Stuck "you\'ve been invited" banner cleared after sign-in. If the silent claim path inside AuthContext failed, the banner previously stranded a signed-in user with non-functional sign-in CTAs. The hook now transitions pre_auth → idle the moment the user becomes non-null, while still honoring the spert:models-changed claim event when it arrives',
        ],
      },
      {
        title: 'Internal',
        items: [
          'Pulled mapInvitationError + InvitationErrorContext out of SharingSection into src/lib/invitationErrors.ts; tests moved alongside',
          'Pulled parseBulkEmails out of SharingSection into src/lib/parseBulkEmails.ts; tests moved alongside',
          'Extracted PendingInvitesList from SharingSection into its own component; SharingSection drops to under 400 LOC',
          'Extracted mapToPendingInvite as a module-level helper in FirestoreAdapter, alongside the existing tsToMillis helper',
        ],
      },
    ],
  },
  {
    version: '0.12.0',
    date: '2026-05-02',
    sections: [
      {
        title: 'Added',
        items: [
          '"Can vote" checkbox at invite time. Owners now decide whether an editor invitee will have voting rights before the invitation is sent. The invitee\'s collaborator record lands with the correct isVoting flag from the moment of acceptance — closing the gap where a freshly-accepted editor could submit pairwise comparisons before the owner had a chance to toggle voting off',
          'Voting toggle on pending invitations. Owners can flip the voting flag on a pending (not yet accepted) editor invite directly from the Sharing section, without revoking and re-inviting',
        ],
      },
      {
        title: 'Changed',
        items: [
          'Pending-invite list shows an interactive Voting checkbox in place of the static "voting" badge for editor invites',
          'Bulk and legacy invite forms now pass the chosen isVoting value through to the sendInvitationEmail callable instead of hardcoding it to true for all editors',
        ],
      },
      {
        title: 'Infra',
        items: [
          'New updateInvite Cloud Function (us-central1, callable v2) on the spert-suite project. Inviter-only authorization, status=pending precondition, updates only isVoting + updatedAt',
          'StorageAdapter gained updateInvite(tokenId, isVoting); FirestoreAdapter calls the new callable; LocalStorageAdapter is a no-op',
        ],
      },
    ],
  },
  {
    version: '0.11.0',
    date: '2026-05-02',
    sections: [
      {
        title: 'Added',
        items: [
          'Email-based bulk invitations. Owners can paste a list of emails into the Sharing section; existing SPERT users are added immediately, new emails receive a one-time invitation link (30-day expiration) that they claim by signing in with the matching email. Up to 25 invitations per UTC day per inviter',
          'Resend & Revoke buttons on pending invitations. Each pending row shows the current send count as (N/5) for cap visibility; Resend re-delivers the invitation email (capped at 5 per invitation), Revoke soft-revokes so the link can no longer be claimed',
          'Pre-auth invitation banner. First-time recipients clicking an invitation link see a dismissible banner with branded "Sign in with Google" / "Sign in with Microsoft" CTAs; after sign-in, the shared decision appears immediately and the banner transitions to a "you\'ve been added" confirmation',
          'Auto-switch to cloud mode when AHP detects an ?invite= URL. New users landing from email no longer get stuck in local mode',
        ],
      },
      {
        title: 'Changed',
        items: [
          'SharingSection error mapping is now context-aware: shared Firebase error codes (resource-exhausted, permission-denied, failed-precondition, not-found) render appropriate copy per call site (send vs resend vs revoke)',
          'removeCollaborator routed through the StorageAdapter; the previous inline updateDoc bypass is gone. Embedded collaborators array and members map are updated atomically',
          'Suite-wide profile mirror: AuthContext now writes to both spertahp_profiles and spertsuite_profiles, enabling cross-app email-to-uid lookups',
        ],
      },
      {
        title: 'Infra',
        items: [
          'Five Cloud Functions live in us-central1 of spert-suite: sendInvitationEmail, claimPendingInvitations, revokeInvite, resendInvite (all callable v2 with cors:true and allUsers Cloud Run invoker), plus the scheduled expireInvitations',
          'Origin-aware invitation URLs (strict allowlist + prod fallback); localhost dev calls produce localhost URLs',
          'Microsoft AD "Last, First Middle" displayName normalization for clean RFC 5322 email From headers',
          'Sender renamed noreply@ → invitations@spertsuite.com for Gmail deliverability',
        ],
      },
    ],
  },
  {
    version: '0.10.1',
    date: '2026-05-01',
    sections: [
      {
        title: 'Changed',
        items: [
          'About link moved from the right side of the header into the tab bar, positioned to the right of the Settings tab. Matches the placement used by other SPERT Suite apps. The header right-side cluster is now Theme → AuthChip',
        ],
      },
    ],
  },
  {
    version: '0.10.0',
    date: '2026-05-01',
    sections: [
      {
        title: 'Added',
        items: [
          'Drag-to-reorder for the Saved Decisions list. A new 6-dot grab handle lets you drag tiles into any order; the new ordering persists across sessions in both local and cloud modes via a new StorageAdapter.reorderModels method and an order field on each ModelIndexEntry',
          'Export All button on the Decisions tab. Bundles every saved decision into a single JSON file for backup or migration; complements the existing single-decision export in Project Settings',
          '"Project" tab for project-scoped settings. Sharing/collaborators, results visibility, disagreement thresholds, single-decision export, and the danger zone live here. The tab only appears when a decision is loaded; closing a decision while on the Project tab redirects to Decisions',
        ],
      },
      {
        title: 'Changed',
        items: [
          'Settings tab is now global-only — cloud storage and export attribution. The previous gear-icon modal has been retired in favor of a proper full-page Settings panel, matching every other SPERT Suite app',
          '"Setup" tab renamed to "Decisions" to match what users actually do there',
          'Header logo and SPERT® AHP wordmark are now clickable: click them to close any open decision and return to the Decisions list. Header right-side icon order standardized to About → Theme → AuthChip',
          'Pairwise comparison intensity bars are now directly clickable. Hovering a bar previews the selection in full color (bars + label both update); clicking commits',
          'Decision tiles got a UX overhaul matching the rest of the suite: tile body is the click target (no more separate Load button), trash icon replaces the Delete text button, and Import is in the list header alongside Export All',
        ],
      },
      {
        title: 'Fixed',
        items: [
          'Consistency Advisor and CR badge no longer appear after only 2 comparisons. Both are now suppressed until you complete every required pair for your tier — the Harker matrix estimation produces unreliable CR values on sparse data, so showing them early was misleading',
          'Voter Radar Chart legend now displays voter display names instead of raw Firebase UIDs. Falls back to a truncated UID when no profile is available',
        ],
      },
    ],
  },
  {
    version: '0.9.2',
    date: '2026-05-01',
    sections: [
      {
        title: 'Added',
        items: [
          'Branded favicon and header icon. New spert-favicon-ahp.png (192×192 PNG, sunflower gold #f59e0b panels with rounded corners) is now the browser tab favicon and appears to the left of the SPERT® AHP wordmark in the header. A charcoal dark-mode variant (spert-favicon-ahp-dark.png) swaps in automatically when the dark theme is active',
        ],
      },
    ],
  },
  {
    version: '0.9.1',
    date: '2026-04-28',
    sections: [
      {
        title: 'Tests',
        items: [
          'Regression coverage for the v0.8.2 collaborator-response-slot fix. Three new LocalStorageAdapter tests verify addCollaborator creates a response slot, saveComparisons works immediately for a newly-added collaborator, and re-adding a collaborator preserves their judgments. One new useAHP test simulates legacy data with a missing slot and verifies loadModel self-heals',
        ],
      },
      {
        title: 'Changed',
        items: [
          'LocalStorageAdapter.addCollaborator now also initializes a response slot, mirroring the v0.8.2 fix in FirestoreAdapter. Local mode is single-user in practice, so this is not user-visible — but it lets the same regression contract test run identically against both adapters',
        ],
      },
    ],
  },
  {
    version: '0.9.0',
    date: '2026-04-28',
    sections: [
      {
        title: 'Changed',
        items: [
          'Unified auth chip behavior. All three chip states (signed-out, signed-in + local, signed-in + cloud) now open the same modal on click — no more positioned popovers. Sign-out is performed from inside the modal',
          'Settings modal renamed to "Cloud Storage" to reflect that the modal is the single home for sign-in, storage mode, and account management',
          'Sign-in buttons restyled to the SPERT Suite standard: blue branded buttons with native-color Google G and Microsoft four-square logos, side-by-side at normal viewport (wraps below ~320px)',
          'Storage radio labels clarified: "Local" → "Local (browser only)" and "Cloud" → "Cloud (sync across devices)"',
          'Identity card in the Cloud Storage modal updated to suite-standard layout: normalized display name on top, email below, red "Sign out" link on the right',
          'Export Attribution placeholder text refreshed to better hint at acceptable identifier values ("e.g., student ID, email, or team name")',
        ],
      },
      {
        title: 'Added',
        items: [
          '"Keep using local storage" button visible only to signed-in users currently on local mode — provides a clear escape hatch from the modal without changing storage mode',
          'Auto-close after sign-out. The Cloud Storage modal closes automatically when sign-out succeeds. If sign-out throws, the modal stays open so the error banner is visible',
          'normalizeDisplayName utility (src/lib/userDisplay.ts) that swaps Microsoft Entra "Last, First MI" into natural reading order while passing other providers through unchanged',
        ],
      },
      {
        title: 'Removed',
        items: [
          'The two account popover components — both replaced by the unified Cloud Storage modal flow. The chip is now a pure trigger; all account actions live inside the modal',
        ],
      },
    ],
  },
  {
    version: '0.8.2',
    date: '2026-04-25',
    sections: [
      {
        title: 'Fixed',
        items: [
          'Critical: Shared collaborators\' judgments now reach synthesis. Previously, addCollaborator wrote the collaborator into the members map but never initialized a response slot for them, so saveComparisons threw "Response not found" the first time they tried to save a judgment — surfaced to the collaborator as a misleading "Save failed — you may have been signed out" error. From the owner\'s side, no shared collaborator\'s data ever landed in Firestore, so synthesis silently aggregated only the owner\'s responses while the "comparisons changed — re-run synthesis" banner kept firing without changing the result. Fix: addCollaborator now creates the response slot at the same time as adding the collaborator',
          'Self-heal for legacy shared models. Existing models that were shared before v0.8.2 had collaborators with no response slot. loadModel now detects this and lazy-creates the missing slot the next time the collaborator opens the model — no manual remediation needed',
        ],
      },
    ],
  },
  {
    version: '0.8.1',
    date: '2026-04-25',
    sections: [
      {
        title: 'Fixed',
        items: [
          'Clearer error message when an email is already registered with a different sign-in provider. Users who previously signed in with Google and then tried Microsoft (or vice versa) on the same email saw an unhandled auth/account-exists-with-different-credential error fall through as a generic failure. The sign-in flow now surfaces a plain-English banner telling the user to use whichever provider they signed in with the first time',
        ],
      },
    ],
  },
  {
    version: '0.8.0',
    date: '2026-04-20',
    sections: [
      {
        title: 'Security',
        items: [
          'Second security audit pass, focused on the auth and cloud-storage subsystem. All sign-out paths now route through a single centralized helper so in-memory decision state, per-user PII, and storage mode reset atomically on every sign-out',
          'Sign-out now clears in-memory decision state. Previously the useAHP reducer state (modelId, model, structure, collaborators, responses, synthesis) survived sign-out — a second user on the same browser saw the prior user\'s decision title, criteria, and responses across Settings / Compare / Results until they manually closed the model. Fix: a module-level signOutCleanupRegistry bridges the provider-nesting gap so AuthContext can reach App-scoped state',
          'Export Attribution PII now cleared on sign-out. The ahp/exportAttribution localStorage key stores a user\'s name and identifier (email or student ID) and is embedded in every exported JSON. Previously never cleared — a second user would see the prior user\'s identity pre-filled in the Export Attribution inputs and silently embedded in any export they produced',
          'Cross-user Firestore contamination via migration closed. The local→cloud migration previously constructed a fresh LocalStorageAdapter and read raw localStorage, which is shared across users on a browser. If User A\'s local decisions remained (local mode is intentionally a shared-browser workspace), User B initiating migration could have uploaded A\'s decisions into B\'s Firestore account. Migration now reads from the in-context adapter via useStorage(), guarded by an instanceof check',
          'ToS-mismatch sign-out now does full cleanup. The version-mismatch forced-sign-out previously skipped the same cleanup the user-initiated sign-out did. All three sign-out entry points now route through a single zero-argument performSignOutWithCleanup helper: clears consent, PII, hasUploaded flag, runs registry (state + mode reset), then calls firebaseSignOut',
          'Storage mode now resets to "local" on every sign-out path. Previously reset by only two of the three paths',
          'Local consent flag (ahp/tos-accepted-version) now cleared on every sign-out. Previously cleared only on the version-mismatch path',
          'ahp/hasUploadedToCloud cleared on sign-out so the next user gets the migration prompt. Previously persisted forever after the first user\'s migration, suppressing the prompt for any subsequent user on the same browser',
          'ToS Firestore write now blocks local acceptance on failure. Previously writeConsentRecord swallowed errors and unconditionally set ahp/tos-accepted-version, so on Firestore failure the local flag claimed acceptance while no Firestore record existed — other SPERT apps would re-prompt. Now writeConsentRecord throws on failure; AuthContext surfaces a user-visible signInError banner, leaves ahp/tos-write-pending set so the next sign-in retries, and performs a full sign-out. The local flag is only set after the Firestore write has succeeded',
          'Popup sign-in error handling overhauled. auth/popup-closed-by-user and auth/cancelled-popup-request now return silently (they no longer produce a generic "Sign-in failed" banner when the user just closed the popup or double-clicked). auth/popup-blocked now surfaces a specific "Sign-in was blocked by your browser. Please allow popups for this site and try again." banner. The write-pending flag is moved inside the try block and the catch clears it so a failed popup cannot orphan the flag',
          'Orphaned modelId on cloud → local switch fixed. Switching from cloud to local mode while viewing a cloud-only decision previously left stale Title/Goal rendered in memory with no working save. Now the mode transition dispatches RESET — user lands cleanly on the Setup tab\'s local decisions list',
          'Unhandled rejection in saveComparisons during sign-out race. If the user clicked Sign Out while a save was in flight, the Firestore PERMISSION_DENIED surfaced as an unhandled promise rejection. Now wrapped in try/catch with a user-visible "Save failed — you may have been signed out" error',
        ],
      },
      {
        title: 'Added',
        items: [
          'Signed-in + local chip state. The auth chip previously had only two branches — a user signed in but in local mode fell through to the signed-out pill, rendering a misleading "Sign in" prompt to an already-authenticated user. New AccountPopoverLocal component handles the signed-in + local state with its own pill (avatar + name + lock icon) and a popover offering two actions: "Switch to Cloud Storage" (navigation-only; opens Settings so the upload/skip prompt appears in the visible Storage section) and "Sign Out"',
          'signInError / clearSignInError on AuthContext surface sign-in errors from AuthContext (where A7 and popup-blocked errors originate) to StorageSection (which owns the error banner). Rendered as signInError ?? error in the existing red banner',
        ],
      },
      {
        title: 'Infrastructure',
        items: [
          'signOutCleanupRegistry module bridges the AuthProvider → StorageProvider → App provider nesting so AuthContext sign-out can reach App-scoped useAHP state and StorageProvider\'s mode preference without prop drilling or hoisting',
          'performSignOutWithCleanup zero-argument helper is the single entry point for every sign-out',
          'peekWritePending and clearWritePending helpers on consent.ts. peekWritePending reads the pending flag without consuming it; clearWritePending removes only the pending flag without touching other consent state',
          '7 new tests covering the cleanup registry and the centralized sign-out helper. All 170 existing + new tests pass',
        ],
      },
    ],
  },
  {
    version: '0.7.3',
    date: '2026-04-18',
    sections: [
      {
        title: 'Changed',
        items: [
          '"CR" acronym spelled out as "Consistency Ratio" in user-facing surfaces where new users first encounter the term. Affected spots: the consistency badge fallback tooltip, the advisor heading and partial-comparison caveat and per-row "Expected ... drop" label, the tier selector subheadings, and the synthesis confidence badge "Avg" row. Compact "CR" retained in space-constrained displays where the term has already been established nearby — the badge pill itself, the per-voter row in the results breakdown, and the advisor progress-bar caption',
        ],
      },
    ],
  },
  {
    version: '0.7.2',
    date: '2026-04-18',
    sections: [
      {
        title: 'Security',
        items: [
          'First security audit pass. Six findings fixed across Firestore rules, UI gating, and the import path; audit report and deferred items retained internally for future passes',
          'Firestore rules: editors can no longer write owner-governed fields on a decision (resultsVisibility, synthesis, publishedSynthesisId, collaborators). Previously the UI gated these to owners but the deployed rule allowed editors to bypass via direct adapter calls',
          'Firestore rules: bulk enumeration of SPERT AHP user profiles is now blocked. The share-by-email lookup still works because it uses a limit(1) query; the collection can no longer be listed in bulk by any authenticated Firebase user',
          'Export is now owner-only in cloud mode. Previously any collaborator (including viewers) could export a shared decision and receive every voter\'s raw comparison matrices in the JSON file, bypassing the "show aggregated to voters" privacy toggle. Local-mode export is unchanged — the local user is always sole owner',
          'JSON import now whitelist-copies every known field from the uploaded envelope. Unknown/rogue fields on meta, structure, items, or responses are dropped rather than persisted as-is. No current rendering path was affected; this is defense-in-depth',
          'JSON import now enforces a 2 MB file size cap. A legitimate AHP export with 50 voters at Complete tier is well under 500 KB; larger files are rejected before JSON.parse to prevent browser hangs on malformed or malicious payloads',
        ],
      },
      {
        title: 'Docs',
        items: [
          'SynthesisBundle type comment now documents that a published synthesis is a point-in-time snapshot; removing a collaborator after synthesis does not retroactively redact them from the stored bundle until synthesis is re-run',
          'Checked-in firestore.rules now mirrors the full suite-wide ruleset as deployed (all SPERT apps plus /users/{uid} ToS record), so the repo file can be diffed against Firebase Console output',
        ],
      },
    ],
  },
  {
    version: '0.7.1',
    date: '2026-04-18',
    sections: [
      {
        title: 'Fixed',
        items: [
          'Cloud mode: real-time sync of the Results Visibility setting. When an owner toggled "show aggregated results to voters" or "show own rankings to voters" on one device, the change was dropped on other subscribed devices — the subscription handler was rebuilding the model record without including the visibility block. Fix: preserve resultsVisibility when applying remote updates',
        ],
      },
      {
        title: 'Refactor',
        items: [
          'First refactor pass on the codebase. Three decompositions with no behavior change — all 153 pre-existing tests still pass, and 8 new tests added for the extracted modules and the visibility bug fix',
          'Extracted a Firestore synthesis codec that centralizes the nested-array JSON-string workaround. Four duplicated serialization/deserialization sites (saveSynthesis, getSynthesis, createModelFromBundle, and the useAHP subscription handler) now share one implementation',
          'Extracted the synthesis math pipeline out of useAHP. The hook shrank from 533 to 301 lines; the 243-line computation moved to a pure pipeline module that can be reasoned about and tested independently of state and storage',
          'Extracted the shared pairwise-comparison layer body. The criteria-layer render block and the per-criterion alternatives-layer render block were ~80% duplicated; ComparisonPanel shrank from 405 to 188 lines with a shared 187-line layer component consumed by both',
        ],
      },
    ],
  },
  {
    version: '0.7.0',
    date: '2026-04-18',
    sections: [
      {
        title: 'JSON Export/Import',
        items: [
          'Export any decision as a portable JSON file from the Settings tab — the envelope includes meta, structure, collaborators, responses, and the published synthesis, plus an attribution block pulled from the app-level Export Attribution fields',
          'Import a previously exported decision from the Setup screen via a new "Import from JSON" button. The importer automatically becomes the owner and the app navigates into the imported model on success',
          'On import, foreign collaborators and their responses are dropped. The original owner\'s response is remapped to the current user, synthesis is stripped, and models that were "synthesized" revert to "open" so they recompute against the new single-user voter set',
          'Provenance is preserved: `_originRef` carries forward and an `imported` entry is appended to the change log',
          'Export Attribution in the global Settings modal is now wired into exports (no longer marked "future feature")',
        ],
      },
      {
        title: 'Architecture',
        items: [
          '`createModelFromBundle` promoted from a FirestoreAdapter-only method to the `StorageAdapter` interface, with a LocalStorageAdapter implementation composed from existing CRUD methods',
          'New `AHPExportBundle` and `AHPExportEnvelope` types, plus `APP_VERSION` constant stamped into every export',
          'Export and import logic lives in standalone utilities (`src/storage/exportModel.ts`, `src/storage/importModel.ts`) rather than inside the adapters',
        ],
      },
      {
        title: 'Tests',
        items: [
          'New `exportImport.test.ts` suite covering schema round-trip, end-to-end local round-trip, version guard, and UID-remap + synthesis-strip behavior (8 tests)',
        ],
      },
    ],
  },
  {
    version: '0.6.2',
    date: '2026-04-18',
    sections: [
      {
        title: 'Fixed',
        items: [
          'Consistency Advisor no longer suggests targets outside the Saaty scale. The eigenvector-implied ratio is now clamped to [1/9, 9] before being displayed or used for the ghost slider marker, so the advisor always points to a value the user can actually set',
        ],
      },
    ],
  },
  {
    version: '0.6.1',
    date: '2026-04-18',
    sections: [
      {
        title: 'Consistency Advisor Polish',
        items: [
          'Advisor language now matches the layer — "more preferred" on alternative layers, "more important" on the decision-factor layer (previously always said "important")',
          'New ghost indicator on each comparison slider: a muted downward arrow and dashed line mark where the slider would need to be for your judgments to be consistent — visual only, does not move the thumb',
          'Advisor computation now lifted to the panel so the spotlight and the ghost indicator share one source of truth',
        ],
      },
    ],
  },
  {
    version: '0.6.0',
    date: '2026-04-17',
    sections: [
      {
        title: 'Consistency Advisor',
        items: [
          'New inline advisor appears below the CR badge whenever CR exceeds 10%, ranking the judgments most likely to be driving inconsistency',
          'Each spotlight row shows your current answer, the value implied by your other judgments, and the expected CR drop if you reconsider',
          'Reconsider button scrolls to the relevant comparison and highlights it with an amber ring (respects prefers-reduced-motion)',
          'Collapsible transitivity section (Complete tier only) explains inconsistencies in plain English when present',
          'CR progress bar shows your current ratio against the 10% target',
        ],
      },
      {
        title: 'Compare Tab Scroll Context',
        items: [
          'Layer tabs are now sticky at the top while scrolling through long comparison lists',
          'New collapsible "Reminder: decision goal" below the tab row keeps intent in reach',
          'Context banners above each comparison section name the goal (criteria layer) or criterion (alternatives layer) you are ranking against',
        ],
      },
      {
        title: 'Results Chart Rewrite',
        items: [
          'PriorityChart replaced with a custom CSS component — long factor/alternative labels now wrap cleanly instead of overflowing the axis',
          'Demoted the Re-run Synthesis button to a small outlined control in the header row',
        ],
      },
      {
        title: 'Copy',
        items: [
          'Consistency badge tooltip language simplified — partial-comparison modes now read "CR estimate — based on partial comparisons" instead of the previous technical label',
        ],
      },
    ],
  },
  {
    version: '0.5.0',
    date: '2026-04-14',
    sections: [
      {
        title: 'Individual Voter Breakdown',
        items: [
          'Per-voter factor weights, alternative scores, and global rankings computed during synthesis',
          'Expandable per-voter cards in Results showing factor weights, alternative scores, and CR',
          'Grey "incomplete" badge flags factors where uniform fallback was applied',
          'VoterRadarChart renders when 2+ voters have individual priority data',
        ],
      },
      {
        title: 'Results Visibility Controls',
        items: [
          'Owner-only "Results Visibility" settings (cloud mode) control what voters see',
          '"Allow voters to see aggregated results" toggle (default: off)',
          '"Allow voters to see their own rankings" toggle (default: on)',
        ],
      },
    ],
  },
  {
    version: '0.4.1',
    date: '2026-04-13',
    sections: [
      {
        title: 'Fixed',
        items: [
          'Fixed "Nested arrays are not supported" error when running synthesis in cloud mode',
        ],
      },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-04-13',
    sections: [
      {
        title: 'Language',
        items: [
          'Renamed "criteria" to "decision factors" across all UI surfaces \u2014 more accessible terminology that avoids goal/objective collision',
          '"Decision Factors" in headers and tabs; "factors" in placeholders and chart labels',
          'About page retains "criteria" for AHP methodology accuracy',
        ],
      },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-04-13',
    sections: [
      {
        title: 'Sharing',
        items: [
          'Collaborator list now displays user names and emails instead of truncated Firebase UIDs',
        ],
      },
      {
        title: 'UX',
        items: [
          'Redesigned comparison slider with intensity bars \u2014 vertical bars grow taller toward the edges, color fills outward from center (blue left, amber right)',
          'Fixed slider direction \u2014 dragging toward an item now means you prefer that item',
          'Slider thumb repositioned below the intensity bars for clearer visual separation',
          'Fixed bug where editing existing criteria or alternative names would swallow keystrokes',
          'Long item labels now wrap instead of truncating with ellipsis',
          'Current Weights bar chart enforces a minimum bar width so small percentages remain visible',
        ],
      },
      {
        title: 'Comparison Matrix',
        items: [
          'Comparison matrix table hidden for non-owner collaborators',
          'For owners, matrix collapsed behind a toggle (default closed)',
        ],
      },
      {
        title: 'Language',
        items: [
          'Renamed "Criteria weights" tab to "Objectives" for more accessible language',
          'Renamed "Criteria Weights" chart in Results to "Objective Weights"',
        ],
      },
    ],
  },
  {
    version: '0.2.4',
    date: '2026-04-09',
    sections: [
      {
        title: 'Documentation',
        items: [
          'Added Quick Reference Guide PDF to the About page \u2014 click "Open PDF" to view in a new browser tab',
        ],
      },
    ],
  },
  {
    version: '0.2.3',
    date: '2026-04-09',
    sections: [
      {
        title: 'Cloud Storage',
        items: [
          'AuthChip is now a single click target in both signed-in and signed-out states — the whole pill (avatar, name, divider, cloud icon) is one button',
          'Clicking the signed-in chip opens a lightweight account popover with the user\u2019s name, email, and a Sign Out button — no more navigating to the Settings tab to sign out',
          'Popover dismisses via Escape, outside click, or Cancel; Sign Out shows a "Signing out\u2026" loading state and guards against re-entry',
        ],
      },
    ],
  },
  {
    version: '0.2.2',
    date: '2026-04-07',
    sections: [
      {
        title: 'Cloud Storage',
        items: [
          'Added explicit Terms of Service and Privacy Policy consent before cloud sign-in — first-time users (and users on an outdated ToS version) must check a box and click "Enable Cloud Storage" before any Firebase Auth popup is opened',
          'Consent is recorded both locally (fast path on subsequent sign-ins) and in Firestore at users/{uid} with the current ToS version',
          'Outdated consent versions force a sign-out and re-consent',
        ],
      },
    ],
  },
  {
    version: '0.2.1',
    date: '2026-04-07',
    sections: [
      {
        title: 'Fixed',
        items: [
          'Cloud storage sign-in flow replaced with the standard pattern used by other SPERT Suite apps — sign-in buttons are now always visible when cloud storage is available, and the Local/Cloud radio only becomes active after signing in',
          'Removed the "radio-first" UX that caused a deadlock where clicking Cloud while signed out did nothing',
          'StorageContext reverted to the canonical single-mode shape from ARCHITECTURE.md \u00A74.4',
        ],
      },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-04-07',
    sections: [
      {
        title: 'Cloud Storage',
        items: [
          'Optional Firebase-backed cloud storage — sign in with Google or Microsoft',
          'Global Settings modal (gear icon in header) for storage mode, sign-in, and export attribution',
          'Auth chip in header: split pill showing account status and quick access to settings',
          'Local → Cloud one-way migration with userId rewrite and provenance preservation',
          'Real-time sync across devices and tabs via Firestore onSnapshot',
          'Per-decision sharing (cloud mode, owner only) — add collaborators by email as editor or viewer',
          'Owner-controlled voting participation toggle for editors',
        ],
      },
      {
        title: 'Architecture',
        items: [
          'StorageAdapter interface converted to async — all methods return Promises',
          'Context-injected storage adapter (LocalStorageAdapter / FirestoreAdapter)',
          'AuthProvider + StorageProvider with storage-ready gate to prevent auth-loading race',
          'Monolithic Firestore document per decision (spertahp_projects/{modelId})',
          'Lightweight fingerprinting: _originRef (workspace UUID) and _changeLog on ModelDoc',
          'Simplified CollaboratorRole: owner / editor / viewer',
        ],
      },
    ],
  },
  {
    version: '0.1.1',
    date: '2026-04-05',
    sections: [
      {
        title: 'Legal',
        items: [
          'Updated Terms of Service and Privacy Policy to v04-05-2026',
          'Added SPERT\u00AE AHP to list of covered apps',
          'Updated effective date to April 5, 2026',
        ],
      },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-04-05',
    sections: [
      {
        title: 'Features',
        items: [
          'AHP decision-making framework with pairwise comparisons',
          'Four comparison tiers: Quick, Balanced, Thorough, Complete',
          'LLSM+RAS weight computation for incomplete matrices',
          'Principal eigenvector for complete matrices',
          'Consistency ratio with Harker Option A for incomplete matrices',
          'Suggest repair for inconsistent comparisons',
          'Global synthesis with weighted criteria and alternatives',
          'Sensitivity analysis with crossover detection',
        ],
      },
      {
        title: 'Group Decision Support',
        items: [
          'AIJ and AIP group aggregation methods',
          'Kendall\'s W concordance with tie-corrected average ranking',
          'Disagreement analytics (CV, nMAD, band classification)',
          'Cosine similarity pairwise agreement',
          'Synthesis confidence badge (RED/AMBER/GREEN)',
        ],
      },
      {
        title: 'UX',
        items: [
          'Tab-based navigation (Setup / Compare / Results / Settings)',
          'Drag-and-drop reordering for criteria and alternatives (@dnd-kit)',
          'Dual-color comparison sliders — blue fills toward left item, amber fills toward right item, with smooth animated transitions',
          'Context-aware slider labels ("more important" for criteria, "more preferred w.r.t. [criterion]" for alternatives)',
          'Disagreement threshold configuration (strict/standard/exploratory presets)',
          'Dark mode with three-state toggle (light/dark/system) — persisted in localStorage',
          'About page with AHP methodology, data security, licensing, and warranty sections',
          'Changelog page with categorized version history',
        ],
      },
      {
        title: 'Legal',
        items: [
          'GNU GPL v3.0 license with attribution preservation terms (Section 7(b))',
          'Terms of Service and Privacy Policy (linked to spertsuite.com)',
          'SPERT\u00AE Suite branding in footer',
        ],
      },
      {
        title: 'Infrastructure',
        items: [
          'LocalStorage-based persistence',
          'Firebase adapter stub (Phase 2 ready)',
          'TypeScript strict mode with noUncheckedIndexedAccess',
          'Tailwind CSS v4 with @tailwindcss/vite plugin',
          'Vite 6, React 18, Vitest test framework',
          'Deployed on Vercel',
        ],
      },
    ],
  },
];

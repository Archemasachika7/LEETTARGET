import type { ZoneExam } from "@leettarget/shared";

export type SourceKind = "Official" | "Course" | "Book" | "Practice" | "Video" | "Reading";

export interface Source {
  title: string;
  by?: string;
  kind: SourceKind;
  /** Books have no link on purpose: the edition you can borrow matters more than a store page. */
  url?: string;
  why: string;
  free: boolean;
}

export interface SourceGroup {
  name: string;
  /** Syllabus section this group backs, when it maps to one. */
  sectionId?: string;
  sources: Source[];
}

const GATE_DA: SourceGroup[] = [
  {
    name: "Start here",
    sources: [
      {
        title: "GATE 2027 DA syllabus (PDF)",
        by: "IIT Madras",
        kind: "Official",
        url: "https://gate2027.iitm.ac.in/static/doc/GATE2027_Syllabus/DA_GATE2027_Syllabus.pdf",
        why: "The only list that decides what can be asked. The checklist above is built from it.",
        free: true,
      },
      {
        title: "GATE DA previous questions, by chapter",
        by: "ExamSIDE",
        kind: "Practice",
        url: "https://questions.examside.com/past-years/gate/gate-da",
        why: "DA has only run since 2024, so there are few papers. Do every one, chapter by chapter.",
        free: true,
      },
      {
        title: "GATE Overflow",
        kind: "Practice",
        url: "https://gateoverflow.in/",
        why: "Worked discussion on past questions. Useful when the official key and your answer disagree.",
        free: true,
      },
      {
        title: "GATE-DA notes",
        by: "IIT Madras BS students",
        kind: "Reading",
        url: "https://iitmbsc-student-projects.github.io/gate-da/",
        why: "Topic notes organised against this syllabus, from an IIT Madras BS student project.",
        free: true,
      },
    ],
  },
  {
    name: "Probability and Statistics",
    sectionId: "ps",
    sources: [
      {
        title: "Stat 110: Probability",
        by: "Joe Blitzstein, Harvard",
        kind: "Course",
        url: "https://stat110.hsites.harvard.edu/",
        why: "Lectures, problem sets with solutions, and a free textbook. Harvard's intro probability course, in full.",
        free: true,
      },
      {
        title: "Introduction to Probability",
        by: "Blitzstein and Hwang",
        kind: "Book",
        url: "http://probabilitybook.net",
        why: "The Stat 110 textbook, free online. Covers every distribution the syllabus names.",
        free: true,
      },
    ],
  },
  {
    name: "Linear Algebra",
    sectionId: "la",
    sources: [
      {
        title: "Essence of Linear Algebra",
        by: "3Blue1Brown",
        kind: "Video",
        url: "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab",
        why: "Watch before the lectures. It shows what eigenvectors and determinants do to space before you compute them.",
        free: true,
      },
      {
        title: "18.06 Linear Algebra",
        by: "Gilbert Strang, MIT OpenCourseWare",
        kind: "Course",
        url: "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/",
        why: "Teaches projections, LU and SVD by working them out by hand, which is how GATE asks them.",
        free: true,
      },
    ],
  },
  {
    name: "Calculus and Optimization",
    sectionId: "co",
    sources: [
      {
        title: "18.01SC Single Variable Calculus",
        by: "MIT OpenCourseWare",
        kind: "Course",
        url: "https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/",
        why: "The syllabus stops at one variable, and so does this course. Limits, Taylor series, maxima and minima.",
        free: true,
      },
    ],
  },
  {
    name: "Programming, Data Structures and Algorithms",
    sectionId: "pdsa",
    sources: [
      {
        title: "Programming, Data Structures and Algorithms using Python",
        by: "Madhavan Mukund, NPTEL",
        kind: "Course",
        url: "https://nptel.ac.in/courses/106106145",
        why: "Covers Python, searching, sorting, trees and graphs, almost topic for topic with this section.",
        free: true,
      },
      {
        title: "The same lectures on YouTube",
        by: "NPTEL",
        kind: "Video",
        url: "https://www.youtube.com/playlist?list=PL9m2Lkh6odgJw2fv71uLelTTE9tn-BUQ9",
        why: "For when you only need the one lecture on quicksort.",
        free: true,
      },
    ],
  },
  {
    name: "Database Management and Warehousing",
    sectionId: "db",
    sources: [
      {
        title: "Database System Concepts",
        by: "Silberschatz, Korth and Sudarshan",
        kind: "Book",
        url: "https://www.db-book.com/",
        why: "ER model, relational algebra, SQL, normal forms and indexing. The site has the slides for free.",
        free: false,
      },
      {
        title: "Data Mining: Concepts and Techniques",
        by: "Han, Kamber and Pei",
        kind: "Book",
        why: "The warehousing lines of the syllabus (concept hierarchies, measures) read like its data cube chapter.",
        free: false,
      },
    ],
  },
  {
    name: "Machine Learning",
    sectionId: "ml",
    sources: [
      {
        title: "An Introduction to Statistical Learning (Python edition)",
        by: "James, Witten, Hastie, Tibshirani, Taylor",
        kind: "Book",
        url: "https://www.statlearning.com/",
        why: "Free PDF. Regression, LDA, cross-validation, trees, SVMs, PCA and clustering, at the depth GATE uses.",
        free: true,
      },
      {
        title: "StatQuest",
        by: "Josh Starmer",
        kind: "Video",
        url: "https://www.youtube.com/@statquest",
        why: "Short videos, one method each, explained with hand drawings. Good for bias-variance and ridge regression.",
        free: true,
      },
    ],
  },
  {
    name: "Artificial Intelligence",
    sectionId: "ai",
    sources: [
      {
        title: "CS188: Introduction to Artificial Intelligence",
        by: "UC Berkeley",
        kind: "Course",
        url: "https://inst.eecs.berkeley.edu/~cs188/",
        why: "Covers search, Bayes nets, variable elimination and sampling, which is every AI line of the syllabus, with problem sets.",
        free: true,
      },
      {
        title: "Artificial Intelligence: A Modern Approach",
        by: "Russell and Norvig",
        kind: "Book",
        url: "https://aima.cs.berkeley.edu/",
        why: "The reference behind CS188. Read the search and probabilistic reasoning chapters.",
        free: false,
      },
    ],
  },
];

const CAT: SourceGroup[] = [
  {
    name: "Start here",
    sources: [
      {
        title: "CAT official website",
        by: "The IIMs",
        kind: "Official",
        url: "https://iimcat.ac.in/",
        why: "Dates, the bulletin and the official mock. Take the mock, since it uses the real interface and timer.",
        free: true,
      },
      {
        title: "CAT question papers, 2017 onward, with video solutions",
        by: "2IIM",
        kind: "Practice",
        url: "https://online.2iim.com/CAT-question-paper/",
        why: "Every slot, free, no sign-up. Past papers are the closest thing CAT has to a syllabus.",
        free: true,
      },
      {
        title: "CAT previous papers",
        by: "Cracku",
        kind: "Practice",
        url: "https://cracku.in/cat-previous-papers/",
        why: "A second set of solutions for the same papers, useful when one explanation doesn't land.",
        free: true,
      },
    ],
  },
  {
    name: "Quantitative Ability",
    sectionId: "qa",
    sources: [
      {
        title: "How to Prepare for Quantitative Aptitude for the CAT",
        by: "Arun Sharma",
        kind: "Book",
        why: "Graded exercises per chapter. Do the first two levels of every chapter before touching the third.",
        free: false,
      },
      {
        title: "Quantum CAT",
        by: "Sarvesh K. Verma",
        kind: "Book",
        why: "More problems per topic than you'll finish. Use it for volume once the basics hold.",
        free: false,
      },
      {
        title: "Rodha",
        by: "Ravi Prakash",
        kind: "Video",
        url: "https://www.youtube.com/c/Rodha/playlists",
        why: "A full free course, sorted into playlists by topic.",
        free: true,
      },
    ],
  },
  {
    name: "Data Interpretation and Logical Reasoning",
    sectionId: "dilr",
    sources: [
      {
        title: "How to Prepare for Data Interpretation and Logical Reasoning for the CAT",
        by: "Arun Sharma",
        kind: "Book",
        why: "DILR has no theory to learn, so practise sets, many of them, against a clock.",
        free: false,
      },
      {
        title: "Free CAT preparation",
        by: "Cracku",
        kind: "Practice",
        url: "https://cracku.in/free-cat-preparation",
        why: "Free DILR sets and sectional tests. Do them against a 40-minute clock.",
        free: true,
      },
    ],
  },
  {
    name: "Verbal Ability and Reading Comprehension",
    sectionId: "varc",
    sources: [
      {
        title: "Aeon",
        kind: "Reading",
        url: "https://aeon.co/",
        why: "Long essays on philosophy, science and culture, in the same register as CAT passages. Read one a day.",
        free: true,
      },
      {
        title: "Arts & Letters Daily",
        kind: "Reading",
        url: "https://www.aldaily.com/",
        why: "A daily list of serious essays from across the web. More variety than one magazine.",
        free: true,
      },
      {
        title: "How to Prepare for Verbal Ability and Reading Comprehension for CAT",
        by: "Arun Sharma and Meenakshi Upadhyay",
        kind: "Book",
        why: "Use it for para jumble and summary drills. RC improves with daily reading.",
        free: false,
      },
      {
        title: "Word Power Made Easy",
        by: "Norman Lewis",
        kind: "Book",
        why: "Vocabulary through word roots. Helps you guess unfamiliar words inside a passage.",
        free: false,
      },
    ],
  },
];

export const ZONE_SOURCES: Record<ZoneExam, SourceGroup[]> = { "gate-da": GATE_DA, cat: CAT };

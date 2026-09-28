/** Syllabus data for the exam zones.
 *
 * Topic `id`s are the join key for synced progress (`zone_progress.topic_id`,
 * migration 0014). Renaming a topic's text is safe; changing its id orphans
 * everyone's progress on it. Add new topics with new ids instead.
 *
 * GATE DA follows the official syllabus published by the organising institute
 * (IIT Madras for GATE 2027): the wording is theirs, only split into items you
 * can tick. CAT has no official syllabus (the IIMs don't publish one), so its
 * list is the conventional topic breakdown, and the zone says so. */

export type ZoneExam = "gate-da" | "cat";

export type TopicStatus = "studied" | "revised";

export interface ZoneTopic {
  id: string;
  name: string;
  /** A PDSA topic with an interactive visualiser in the GATE zone. */
  viz?: PdsaVizId;
}

export interface ZoneSection {
  id: string;
  name: string;
  /** Optional grouping inside a section, e.g. "Supervised learning". */
  groups?: { name: string; topicIds: string[] }[];
  topics: ZoneTopic[];
}

export interface ZoneSyllabus {
  exam: ZoneExam;
  title: string;
  /** Where the list comes from, shown under the checklist. */
  provenance: string;
  official: boolean;
  sections: ZoneSection[];
}

export type PdsaVizId = "sorting" | "searching" | "hashing" | "bst" | "graphs" | "linear";

const t = (id: string, name: string, viz?: PdsaVizId): ZoneTopic => (viz ? { id, name, viz } : { id, name });

export const GATE_DA_SYLLABUS: ZoneSyllabus = {
  exam: "gate-da",
  title: "GATE DA · Data Science and Artificial Intelligence",
  provenance:
    "Official GATE 2027 DA syllabus, IIT Madras. Wording kept as published; long lines are split into separate items.",
  official: true,
  sections: [
    {
      id: "ps",
      name: "Probability and Statistics",
      topics: [
        t("ps.counting", "Counting (permutation and combination)"),
        t("ps.axioms", "Probability axioms, sample space, events, independent and mutually exclusive events"),
        t("ps.joint", "Marginal, conditional and joint probability"),
        t("ps.bayes", "Bayes theorem"),
        t("ps.condexp", "Conditional expectation and variance"),
        t("ps.descriptive", "Mean, median, mode and standard deviation"),
        t("ps.corr", "Correlation and covariance"),
        t("ps.discrete", "Random variables, discrete random variables and probability mass functions"),
        t("ps.discrete-dist", "Uniform, Bernoulli and binomial distributions"),
        t("ps.continuous", "Continuous random variables and probability distribution function"),
        t("ps.continuous-dist", "Uniform, exponential, Poisson, normal and standard normal distributions"),
        t("ps.t-chi", "t-distribution and chi-squared distributions"),
        t("ps.cdf", "Cumulative distribution function, conditional PDF"),
        t("ps.clt", "Central limit theorem, confidence interval"),
        t("ps.tests", "z-test, t-test, chi-squared test"),
      ],
    },
    {
      id: "la",
      name: "Linear Algebra",
      topics: [
        t("la.spaces", "Vector space, subspaces"),
        t("la.independence", "Linear dependence and independence of vectors"),
        t("la.matrices", "Matrices: projection, orthogonal, idempotent and partition matrices and their properties"),
        t("la.quadratic", "Quadratic forms"),
        t("la.systems", "Systems of linear equations and solutions; Gaussian elimination"),
        t("la.eigen", "Eigenvalues and eigenvectors"),
        t("la.det-rank", "Determinant, rank, nullity"),
        t("la.projections", "Projections"),
        t("la.lu", "LU decomposition"),
        t("la.svd", "Singular value decomposition"),
      ],
    },
    {
      id: "co",
      name: "Calculus and Optimization",
      topics: [
        t("co.functions", "Functions of a single variable"),
        t("co.limits", "Limit, continuity and differentiability"),
        t("co.taylor", "Taylor series"),
        t("co.extrema", "Maxima and minima"),
        t("co.optimization", "Optimization involving a single variable"),
      ],
    },
    {
      id: "pdsa",
      name: "Programming, Data Structures and Algorithms",
      topics: [
        t("pdsa.python", "Programming in Python"),
        t("pdsa.stacks-queues", "Stacks and queues", "linear"),
        t("pdsa.linked-lists", "Linked lists", "linear"),
        t("pdsa.trees", "Trees", "bst"),
        t("pdsa.hash-tables", "Hash tables", "hashing"),
        t("pdsa.search", "Linear search and binary search", "searching"),
        t("pdsa.basic-sorts", "Selection sort, bubble sort and insertion sort", "sorting"),
        t("pdsa.divide-conquer", "Divide and conquer: mergesort, quicksort", "sorting"),
        t("pdsa.graph-theory", "Introduction to graph theory", "graphs"),
        t("pdsa.traversals", "Graph traversals", "graphs"),
        t("pdsa.shortest-path", "Shortest path", "graphs"),
      ],
    },
    {
      id: "db",
      name: "Database Management and Warehousing",
      topics: [
        t("db.er", "ER model"),
        t("db.relational", "Relational model: relational algebra, tuple calculus"),
        t("db.sql", "SQL"),
        t("db.constraints", "Integrity constraints, normal forms"),
        t("db.files", "File organization, indexing"),
        t("db.transform", "Data types; data transformation: normalization, discretization, sampling, compression"),
        t("db.warehouse", "Data warehouse modelling: schema for multidimensional data models"),
        t("db.measures", "Concept hierarchies; measures: categorization and computations"),
      ],
    },
    {
      id: "ml",
      name: "Machine Learning",
      groups: [
        {
          name: "Supervised learning",
          topicIds: [
            "ml.problems", "ml.linear", "ml.ridge", "ml.logistic", "ml.knn", "ml.naive-bayes",
            "ml.lda", "ml.svm", "ml.trees", "ml.bias-variance", "ml.cv", "ml.mlp",
          ],
        },
        { name: "Unsupervised learning", topicIds: ["ml.kmeans", "ml.hierarchical", "ml.pca"] },
      ],
      topics: [
        t("ml.problems", "Regression and classification problems"),
        t("ml.linear", "Simple linear regression, multiple linear regression"),
        t("ml.ridge", "Ridge regression"),
        t("ml.logistic", "Logistic regression"),
        t("ml.knn", "k-nearest neighbour"),
        t("ml.naive-bayes", "Naive Bayes classifier"),
        t("ml.lda", "Linear discriminant analysis"),
        t("ml.svm", "Support vector machine"),
        t("ml.trees", "Decision trees"),
        t("ml.bias-variance", "Bias-variance trade-off"),
        t("ml.cv", "Cross-validation: leave-one-out (LOO), k-folds"),
        t("ml.mlp", "Multi-layer perceptron, feed-forward neural network"),
        t("ml.kmeans", "Clustering algorithms: k-means / k-medoid"),
        t("ml.hierarchical", "Hierarchical clustering: top-down, bottom-up (single-linkage, multiple-linkage)"),
        t("ml.pca", "Dimensionality reduction, principal component analysis"),
      ],
    },
    {
      id: "ai",
      name: "Artificial Intelligence",
      topics: [
        t("ai.search", "Search: informed, uninformed, adversarial"),
        t("ai.logic", "Logic: propositional, predicate"),
        t("ai.cond-indep", "Reasoning under uncertainty: conditional independence representation"),
        t("ai.exact", "Exact inference through variable elimination"),
        t("ai.approx", "Approximate inference through sampling"),
      ],
    },
    {
      id: "ga",
      name: "General Aptitude",
      topics: [
        t("ga.verbal", "Verbal aptitude"),
        t("ga.quant", "Quantitative aptitude"),
        t("ga.analytical", "Analytical aptitude"),
        t("ga.spatial", "Spatial aptitude"),
      ],
    },
  ],
};

export const CAT_SYLLABUS: ZoneSyllabus = {
  exam: "cat",
  title: "CAT · Common Admission Test",
  provenance:
    "The IIMs don't publish a syllabus. This is the topic list past papers keep returning to, grouped the usual way.",
  official: false,
  sections: [
    {
      id: "varc",
      name: "Verbal Ability and Reading Comprehension",
      topics: [
        t("varc.rc", "Reading comprehension"),
        t("varc.parajumbles", "Para jumbles"),
        t("varc.summary", "Para summary"),
        t("varc.odd-one", "Odd sentence out"),
      ],
    },
    {
      id: "dilr",
      name: "Data Interpretation and Logical Reasoning",
      topics: [
        t("dilr.charts", "Tables and charts (bar, line, pie)"),
        t("dilr.quant-di", "Calculation-heavy DI: growth rates, averages, ratios"),
        t("dilr.arrangements", "Arrangements: linear, circular, distributions"),
        t("dilr.games", "Games and tournaments"),
        t("dilr.venn", "Venn diagrams and set-based puzzles"),
        t("dilr.networks", "Routes and networks"),
        t("dilr.selection", "Selection and scheduling with conditions"),
      ],
    },
    {
      id: "qa",
      name: "Quantitative Ability",
      groups: [
        {
          name: "Arithmetic",
          topicIds: ["qa.percent", "qa.profit", "qa.ratio", "qa.averages", "qa.interest", "qa.work", "qa.tsd"],
        },
        { name: "Algebra", topicIds: ["qa.equations", "qa.inequalities", "qa.functions", "qa.logs", "qa.progressions"] },
        { name: "Geometry and mensuration", topicIds: ["qa.triangles", "qa.circles", "qa.mensuration", "qa.coordinate", "qa.trig"] },
        { name: "Number system", topicIds: ["qa.divisibility", "qa.remainders"] },
        { name: "Modern maths", topicIds: ["qa.pnc", "qa.probability", "qa.sets"] },
      ],
      topics: [
        t("qa.percent", "Percentages"),
        t("qa.profit", "Profit, loss and discount"),
        t("qa.ratio", "Ratio, proportion and variation"),
        t("qa.averages", "Averages, mixtures and alligation"),
        t("qa.interest", "Simple and compound interest"),
        t("qa.work", "Time and work, pipes and cisterns"),
        t("qa.tsd", "Time, speed and distance"),
        t("qa.equations", "Linear and quadratic equations"),
        t("qa.inequalities", "Inequalities and modulus"),
        t("qa.functions", "Functions and graphs"),
        t("qa.logs", "Logarithms, surds and indices"),
        t("qa.progressions", "Progressions and series"),
        t("qa.triangles", "Lines, angles and triangles"),
        t("qa.circles", "Circles and polygons"),
        t("qa.mensuration", "Mensuration, 2D and 3D"),
        t("qa.coordinate", "Coordinate geometry"),
        t("qa.trig", "Basic trigonometry, heights and distances"),
        t("qa.divisibility", "Divisibility, factors, HCF and LCM"),
        t("qa.remainders", "Remainders and base systems"),
        t("qa.pnc", "Permutations and combinations"),
        t("qa.probability", "Probability"),
        t("qa.sets", "Set theory"),
      ],
    },
  ],
};

export const ZONE_SYLLABI: Record<ZoneExam, ZoneSyllabus> = {
  "gate-da": GATE_DA_SYLLABUS,
  cat: CAT_SYLLABUS,
};

export interface SectionSummary {
  sectionId: string;
  total: number;
  studied: number;
  revised: number;
}

/** Counts per section. A topic marked "revised" also counts as studied: you
 * can't revise what you never covered, so revised is a subset of studied. */
export function summariseSections(
  syllabus: ZoneSyllabus,
  progress: ReadonlyMap<string, TopicStatus>
): SectionSummary[] {
  return syllabus.sections.map((section) => {
    let studied = 0;
    let revised = 0;
    for (const topic of section.topics) {
      const status = progress.get(topic.id);
      if (status) studied++;
      if (status === "revised") revised++;
    }
    return { sectionId: section.id, total: section.topics.length, studied, revised };
  });
}

/** The status a topic moves to when its checkbox is clicked: untouched →
 * studied → revised → back to untouched. */
export function nextTopicStatus(current: TopicStatus | undefined): TopicStatus | undefined {
  if (current === undefined) return "studied";
  if (current === "studied") return "revised";
  return undefined;
}

export function allTopicIds(syllabus: ZoneSyllabus): string[] {
  return syllabus.sections.flatMap((s) => s.topics.map((topic) => topic.id));
}

import { User, Course, Roadmap, TimestampNote, Lesson, QuizQuestion } from '../types';

export const mockUser: User = {
  id: 'usr_alex_01',
  name: 'Alex',
  email: 'alex@learntube.app',
  plan: 'free',
  dailyGoalMinutes: 90,
  streakDays: 4,
  createdAt: '2026-10-15T09:00:00Z',
};

function buildTechnicalArticle(
  title: string,
  summary: string,
  conceptTag: string,
  codeSnippet: string,
  bullets: string[]
): string {
  return `## ${title}

${summary}

When studying **${conceptTag}**, focus on the structural invariants that remain true across every step of execution. Breaking the problem into smaller, verifiable sub-steps prevents subtle off-by-one or boundary errors.

### Key Takeaways
${bullets.map((b) => `- ${b}`).join('\n')}

\`\`\`python
${codeSnippet}
\`\`\`

Review the implementation above alongside the video segment and pause to trace how state evolves on a small 4-element example before moving to the next lesson.`;
}

function buildHumanitiesArticle(
  title: string,
  summary: string,
  conceptTag: string,
  bullets: string[]
): string {
  return `## ${title}

${summary}

In the context of **${conceptTag}**, every formal decision reflects a balance between structural necessity and perceptual clarity. Rather than treating rules as rigid formulas, observe how proportion and hierarchy guide attention.

### Core Principles to Observe
${bullets.map((b) => `- ${b}`).join('\n')}

As you watch this segment, note how these principles reinforce each other across scales—from micro-details up to the overall composition.`;
}

interface RawQuizSpec {
  q1Prompt: string;
  q1Options: [string, string, string, string];
  q1Correct: number;
  q1Explanation: string;
  q2Prompt: string;
  q2Options: [string, string, string, string];
  q2Correct: number;
  q2Explanation: string;
}

function createLessonQuestions(
  lessonId: string,
  startSeconds: number,
  endSeconds: number,
  spec: RawQuizSpec
): QuizQuestion[] {
  const span = Math.max(60, endSeconds - startSeconds);
  const ts1 = startSeconds + Math.floor(span * 0.32);
  const ts2 = startSeconds + Math.floor(span * 0.68);
  return [
    {
      id: `${lessonId}_q1`,
      lessonId,
      questionPrompt: spec.q1Prompt,
      options: spec.q1Options,
      correctOptionIndex: spec.q1Correct,
      explanationText: spec.q1Explanation,
      explanationTimestampSeconds: ts1,
      isPlacementEligible: true,
    },
    {
      id: `${lessonId}_q2`,
      lessonId,
      questionPrompt: spec.q2Prompt,
      options: spec.q2Options,
      correctOptionIndex: spec.q2Correct,
      explanationText: spec.q2Explanation,
      explanationTimestampSeconds: ts2,
      isPlacementEligible: false,
    },
  ];
}

const mitAlgorithmsLessons: Lesson[] = [
  {
    id: 'alg_01',
    sequenceNumber: 1,
    title: 'Algorithmic Thinking & Peak Finding in 1D and 2D Arrays',
    summaryDescription: 'Formulate computational problems rigorously and compare greedy ascent against divide-and-conquer peak finding.',
    durationSeconds: 780,
    youtubeVideoId: 'HtSuA80QTyo',
    startSeconds: 0,
    endSeconds: 780,
    conceptTag: 'Divide & Conquer',
    articleMarkdown: buildTechnicalArticle(
      'Peak Finding & Divide-and-Conquer Strategy',
      'A peak in a 1D array is an element that is greater than or equal to its immediate neighbors. While a linear scan takes O(n) worst-case comparisons, binary halving reduces complexity to O(log n).',
      'Divide & Conquer',
      `def find_peak_1d(arr, low, high):
    mid = (low + high) // 2
    if mid > 0 and arr[mid] < arr[mid - 1]:
        return find_peak_1d(arr, low, mid - 1)
    if mid < len(arr) - 1 and arr[mid] < arr[mid + 1]:
        return find_peak_1d(arr, mid + 1, high)
    return mid`,
      [
        'A 1D peak is guaranteed to exist in any non-empty finite array.',
        'Directional comparison at the midpoint eliminates half the search space immediately.',
        'In 2D grids of size n × m, picking the column maximum and recursing achieves O(n log m) time.',
      ]
    ),
    quizQuestions: createLessonQuestions('alg_01', 0, 780, {
      q1Prompt: 'What is the worst-case time complexity of recursive binary peak finding on a 1D array of length n?',
      q1Options: ['Θ(log n)', 'Θ(n)', 'Θ(n log n)', 'Θ(√n)'],
      q1Correct: 0,
      q1Explanation: 'Comparing the midpoint to its immediate neighbors discards half of the remaining array at every step, yielding T(n) = T(n/2) + Θ(1) = Θ(log n).',
      q2Prompt: 'Why is a 1D peak always guaranteed to exist when we recurse into the half containing a strictly larger neighbor?',
      q2Options: [
        'Because the array is pre-sorted in ascending order',
        'Because a strictly increasing walk on a finite subarray must either hit the boundary or peak internally',
        'Because duplicate values are disallowed in the input',
        'Because the midpoint is always the global maximum',
      ],
      q2Correct: 1,
      q2Explanation: 'Entering a half via a rising edge means the sequence cannot decrease at the entry boundary; on a finite domain it must eventually drop or reach the far boundary.',
    }),
  },
  {
    id: 'alg_02',
    sequenceNumber: 2,
    title: 'Asymptotic Complexity: Big-O, Omega, and Theta Notation',
    summaryDescription: 'Analyze upper, lower, and tight bounds on runtime growth as input size scales toward infinity.',
    durationSeconds: 840,
    youtubeVideoId: 'HtSuA80QTyo',
    startSeconds: 780,
    endSeconds: 1620,
    conceptTag: 'Complexity',
    articleMarkdown: buildTechnicalArticle(
      'Asymptotic Growth & Tight Bounds',
      'Asymptotic notation suppresses machine-dependent constants and lower-order terms so we can compare algorithms strictly by how their runtime scales with input size n.',
      'Complexity',
      `# Comparing O(n) vs O(n^2) operation counts
def count_pairs_quadratic(items):
    steps = 0
    for x in items:
        for y in items:
            steps += 1
    return steps  # Theta(n^2)`,
      [
        'Big-O (O) bounds growth from above; Big-Omega (Ω) bounds growth from below.',
        'Big-Theta (Θ) holds when upper and lower asymptotic bounds match within constant factors.',
        'Leading polynomial or exponential terms always dominate lower-degree additives as n → ∞.',
      ]
    ),
    quizQuestions: createLessonQuestions('alg_02', 780, 1620, {
      q1Prompt: 'If an algorithm has running time T(n) = 4n² + 100n + 500, which tight asymptotic bound describes T(n)?',
      q1Options: ['Θ(n)', 'Θ(n²)', 'Θ(n² log n)', 'Θ(4n²)'],
      q1Correct: 1,
      q1Explanation: 'As n grows large, the quadratic term 4n² dominates 100n + 500, and constant coefficients are dropped in Θ-notation.',
      q2Prompt: 'What does the statement f(n) = Ω(g(n)) formally guarantee for sufficiently large n?',
      q2Options: [
        'f(n) is bounded above by c · g(n) for some positive constant c',
        'f(n) is bounded below by c · g(n) for some positive constant c',
        'f(n) / g(n) converges to 0 as n approaches infinity',
        'f(n) equals g(n) for all inputs n ≥ 1',
      ],
      q2Correct: 1,
      q2Explanation: 'Big-Omega (Ω) provides an asymptotic lower bound, meaning f(n) ≥ c · g(n) for all n ≥ n₀.',
    }),
  },
  {
    id: 'alg_03',
    sequenceNumber: 3,
    title: 'Models of Computation, RAM Machine & Document Distance',
    summaryDescription: 'Define constant-time word operations and compute inner-product similarity between text corpora.',
    durationSeconds: 920,
    youtubeVideoId: 'Zc54gFhdpLA',
    startSeconds: 0,
    endSeconds: 920,
    conceptTag: 'Computation Models',
    articleMarkdown: buildTechnicalArticle(
      'Random Access Machine & Vector Document Distance',
      'The RAM model assumes w-bit words can be read, added, or compared in O(1) time. Using this abstraction, we measure document similarity via the angle between word-frequency vectors.',
      'Computation Models',
      `import math
from collections import Counter

def cosine_similarity(doc_a: str, doc_b: str) -> float:
    vec_a, vec_b = Counter(doc_a.split()), Counter(doc_b.split())
    dot = sum(vec_a[w] * vec_b[w] for w in vec_a)
    norm_a = math.sqrt(sum(v * v for v in vec_a.values()))
    norm_b = math.sqrt(sum(v * v for v in vec_b.values()))
    return dot / (norm_a * norm_b)`,
      [
        'Tokenizing text into frequency maps turns documents into sparse high-dimensional vectors.',
        'Normalized dot products yield scale-invariant cosine angles between 0 and π/2.',
        'Hash-based dictionary accumulation runs in expected linear time O(n).',
      ]
    ),
    quizQuestions: createLessonQuestions('alg_03', 0, 920, {
      q1Prompt: 'Why do we divide the inner product D₁ · D₂ by ||D₁|| ||D₂|| when computing document distance?',
      q1Options: [
        'To avoid floating-point overflow on short strings',
        'To make the similarity metric invariant to total document length',
        'To convert word counts into negative log probabilities',
        'To sort the dictionary keys alphabetically',
      ],
      q1Correct: 1,
      q1Explanation: 'Normalizing by the Euclidean lengths ||D₁|| and ||D₂|| measures the cosine of the angle between vectors, so duplicating a document does not change its topic direction.',
      q2Prompt: 'In the standard Random Access Machine (RAM) model, how long does loading a single w-bit word from an arbitrary memory address take?',
      q2Options: ['O(1) constant time', 'O(log n) time', 'O(w) linear time', 'O(n) memory scan time'],
      q2Correct: 0,
      q2Explanation: 'The RAM abstraction models memory as a flat array where any w-bit word (with w ≥ log₂ n) is addressable in O(1) time.',
    }),
  },
  {
    id: 'alg_04',
    sequenceNumber: 4,
    title: 'Insertion Sort, Inversions & Loop Invariant Proofs',
    summaryDescription: 'Prove sorting correctness via initialization, maintenance, and termination invariants alongside binary insertion optimizations.',
    durationSeconds: 720,
    youtubeVideoId: 'Kg4bqzAqRBM',
    startSeconds: 0,
    endSeconds: 720,
    conceptTag: 'Sorting',
    articleMarkdown: buildTechnicalArticle(
      'Insertion Sort & Loop Invariants',
      'Insertion sort maintains a sorted prefix subarray A[0..i-1] and inserts element A[i] into its proper position by shifting larger elements rightward.',
      'Sorting',
      `def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr`,
      [
        'Each swap of adjacent elements removes exactly one inversion from the array.',
        'Binary search reduces comparisons to O(n log n), but element shifts still cost O(n²).',
        'Nearly sorted arrays with O(n) inversions finish in linear O(n) time.',
      ]
    ),
    quizQuestions: createLessonQuestions('alg_04', 0, 720, {
      q1Prompt: 'What is the worst-case number of element shifts performed by Binary Insertion Sort on an array of n elements?',
      q1Options: ['Θ(n log n)', 'Θ(n²)', 'Θ(n)', 'Θ(log n)'],
      q1Correct: 1,
      q1Explanation: 'Even though binary search finds the insertion index in O(log i) comparisons, shifting the subarray elements right still takes Θ(i) memory writes per step, totaling Θ(n²).',
      q2Prompt: 'How many inversions are removed when Insertion Sort swaps two adjacent out-of-order elements A[j] and A[j+1]?',
      q2Options: ['Exactly 1 inversion', 'Up to n inversions', '2 inversions', '0 inversions'],
      q2Correct: 0,
      q2Explanation: 'Swapping two adjacent elements only changes the relative order of that specific pair, reducing the total inversion count by exactly 1.',
    }),
  },
  {
    id: 'alg_05',
    sequenceNumber: 5,
    title: 'Merge Sort & Solving Recurrences with Recursion Trees',
    summaryDescription: 'Decompose arrays recursively, merge sorted halves in linear time, and solve T(n) = 2T(n/2) + cn.',
    durationSeconds: 960,
    youtubeVideoId: 'Kg4bqzAqRBM',
    startSeconds: 720,
    endSeconds: 1680,
    conceptTag: 'Recurrences',
    articleMarkdown: buildTechnicalArticle(
      'Merge Sort & Recursion Tree Analysis',
      'Merge sort splits an n-element array into two halves of size n/2, recursively sorts both, and merges the sorted sequences using a two-finger linear scan.',
      'Recurrences',
      `def merge(left, right):
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    return out + left[i:] + right[j:]`,
      [
        'A recursion tree of depth log₂(n) doing cn work per level totals Θ(n log n) time.',
        'Standard two-way merge requires Θ(n) auxiliary space.',
        'Left-biased tie breaking (<=) preserves relative order, making Merge Sort stable.',
      ]
    ),
    quizQuestions: createLessonQuestions('alg_05', 720, 1680, {
      q1Prompt: 'In the recursion tree for Merge Sort’s recurrence T(n) = 2T(n/2) + cn, how much total merge work is performed across all nodes at depth k?',
      q1Options: ['cn / 2^k', 'cn', 'c · 2^k', 'cn log n'],
      q1Correct: 1,
      q1Explanation: 'At depth k there are 2^k subproblems each of size n / 2^k, so the work at that level sums to 2^k · c(n / 2^k) = cn.',
      q2Prompt: 'How much auxiliary memory does standard two-way Merge Sort require on an n-element array?',
      q2Options: ['Θ(1)', 'Θ(log n)', 'Θ(n)', 'Θ(n log n)'],
      q2Correct: 2,
      q2Explanation: 'Merging two sorted halves of total length n into a temporary output buffer requires Θ(n) auxiliary space.',
    }),
  },
  {
    id: 'alg_06',
    sequenceNumber: 6,
    title: 'Priority Queues, Binary Heaps & Max-Heapify Mechanics',
    summaryDescription: 'Represent complete binary trees implicitly inside flat arrays and restore the max-heap invariant in O(log n) time.',
    durationSeconds: 880,
    youtubeVideoId: 'B7hVxCmfPtM',
    startSeconds: 0,
    endSeconds: 880,
    conceptTag: 'Heaps',
    articleMarkdown: buildTechnicalArticle(
      'Implicit Binary Heaps & Max-Heapify',
      'A binary max-heap is a nearly complete binary tree stored inside an array where every parent node is at least as large as its two children.',
      'Heaps',
      `def max_heapify(arr, n, i):
    largest = i
    left, right = 2 * i + 1, 2 * i + 2
    if left < n and arr[left] > arr[largest]:
        largest = left
    if right < n and arr[right] > arr[largest]:
        largest = right
    if largest != i:
        arr[i], arr[largest] = arr[largest], arr[i]
        max_heapify(arr, n, largest)`,
      [
        'Array index arithmetic maps parent i to children 2i+1 and 2i+2 without pointers.',
        'Max-Heapify assumes both subtrees are valid heaps and sinks a single violation downward.',
        'Tree height is ⌊log₂ n⌋, bounding each sink operation to O(log n) steps.',
      ]
    ),
    quizQuestions: createLessonQuestions('alg_06', 0, 880, {
      q1Prompt: 'In a 0-indexed array representation of a binary heap, what are the indices of the left and right children of node i?',
      q1Options: ['2i and 2i + 1', '2i + 1 and 2i + 2', 'i / 2 and i / 2 + 1', 'i + 1 and i + 2'],
      q1Correct: 1,
      q1Explanation: 'When the root is at index 0, the left child of index i sits at 2i + 1 and the right child sits at 2i + 2.',
      q2Prompt: 'What precondition does Max-Heapify(A, i) assume before it is called on index i?',
      q2Options: [
        'The entire array A is already sorted',
        'The binary trees rooted at Left(i) and Right(i) are already valid max-heaps',
        'Node i is a leaf node with no children',
        'All keys in the left subtree are smaller than all keys in the right subtree',
      ],
      q2Correct: 1,
      q2Explanation: 'Max-Heapify repairs a single violation at index i under the assumption that both child subtrees already satisfy the max-heap invariant.',
    }),
  },
  {
    id: 'alg_07',
    sequenceNumber: 7,
    title: 'Building a Heap in Linear Time & In-Place Heapsort',
    summaryDescription: 'Understand why bottom-up Build-Max-Heap converges in O(n) steps rather than O(n log n) and sort without auxiliary memory.',
    durationSeconds: 760,
    youtubeVideoId: 'B7hVxCmfPtM',
    startSeconds: 880,
    endSeconds: 1640,
    conceptTag: 'Sorting',
    articleMarkdown: buildTechnicalArticle(
      'Linear-Time Build-Max-Heap & Heapsort',
      'Calling Max-Heapify from index n//2 - 1 down to 0 builds a valid max-heap in O(n) total operations because most nodes reside near the bottom leaves.',
      'Sorting',
      `def heap_sort(arr):
    n = len(arr)
    for i in range(n // 2 - 1, -1, -1):
        max_heapify(arr, n, i)
    for end in range(n - 1, 0, -1):
        arr[0], arr[end] = arr[end], arr[0]
        max_heapify(arr, end, 0)
    return arr`,
      [
        'Leaves (indices n//2 to n-1) trivially satisfy the heap property of height 0.',
        'Summing node heights across levels forms a convergent geometric series bounded by 2n.',
        'Repeatedly swapping the root maximum with the last element sorts in-place in O(n log n).',
      ]
    ),
    quizQuestions: createLessonQuestions('alg_07', 880, 1640, {
      q1Prompt: 'What is the tight asymptotic runtime of bottom-up Build-Max-Heap on an unsorted array of n elements?',
      q1Options: ['Θ(n)', 'Θ(n log n)', 'Θ(log n)', 'Θ(n²)'],
      q1Correct: 0,
      q1Explanation: 'Because at most ⌈n / 2^(h+1)⌉ nodes have height h, the total work sums to O(n · Σ h/2^h) = Θ(n).',
      q2Prompt: 'Why does Build-Max-Heap start iterating at index ⌊n/2⌋ - 1 instead of n - 1?',
      q2Options: [
        'Because elements from ⌊n/2⌋ to n - 1 are 1-element leaf heaps that already satisfy the heap property',
        'Because the second half of the array is already sorted',
        'To reserve the second half of the array as swap space',
        'Because max-heaps only store half of the input elements',
      ],
      q2Correct: 0,
      q2Explanation: 'All indices ≥ ⌊n/2⌋ have no children in the complete binary tree, so they are trivial 1-node max-heaps.',
    }),
  },
  {
    id: 'alg_08',
    sequenceNumber: 8,
    title: 'Binary Search Trees & Runway Reservation Systems',
    summaryDescription: 'Support dynamic rank queries, predecessor/successor lookups, and subtree size augmentation.',
    durationSeconds: 900,
    youtubeVideoId: '9Jry5-82I68',
    startSeconds: 0,
    endSeconds: 900,
    conceptTag: 'Trees',
    articleMarkdown: buildTechnicalArticle(
      'Binary Search Trees & Subtree Augmentation',
      'A Binary Search Tree (BST) stores keys such that all keys in the left subtree are ≤ the node key and all keys in the right subtree are ≥ the node key.',
      'Trees',
      `class BSTNode:
    def __init__(self, key):
        self.key = key
        self.size = 1
        self.left = None
        self.right = None`,
      [
        'In-order traversal visits all BST keys in monotonically non-decreasing order in Θ(n).',
        'Augmenting each node with subtree size enables O(h) rank and order-statistic queries.',
        'Unbalanced insertions in sorted order degrade tree height h to O(n).',
      ]
    ),
    quizQuestions: createLessonQuestions('alg_08', 0, 900, {
      q1Prompt: 'How do we augment each node of a Binary Search Tree to compute the rank (number of keys ≤ x) in O(h) time?',
      q1Options: [
        'Store a pointer to the global minimum in every node',
        'Store the size (total node count) of the subtree rooted at each node',
        'Store the sum of all keys in the right subtree',
        'Color every alternate level red and black',
      ],
      q1Correct: 1,
      q1Explanation: 'Maintaining subtree sizes lets us add left.size + 1 whenever we branch right along the search path, computing rank in O(h) steps.',
      q2Prompt: 'Where is the successor of a BST node x located when x has a non-empty right subtree?',
      q2Options: [
        'The leftmost (minimum) node inside x’s right subtree',
        'The rightmost (maximum) node inside x’s left subtree',
        'The immediate parent of x',
        'The root of the entire BST',
      ],
      q2Correct: 0,
      q2Explanation: 'The smallest key greater than x.key must reside in x.right, found by following left child pointers until None.',
    }),
  },
  {
    id: 'alg_09',
    sequenceNumber: 9,
    title: 'AVL Trees: Balance Factors, Left & Right Tree Rotations',
    summaryDescription: 'Maintain O(log n) worst-case height guarantees after arbitrary insertions using local single and double rotations.',
    durationSeconds: 1080,
    youtubeVideoId: 'FNeL18KsWPc',
    startSeconds: 0,
    endSeconds: 1080,
    conceptTag: 'Balanced Trees',
    articleMarkdown: buildTechnicalArticle(
      'Self-Balancing AVL Trees & Rotations',
      'AVL trees enforce that for every node, the heights of its left and right children differ by at most 1. When an insertion creates a height difference of 2, rotations restore balance.',
      'Balanced Trees',
      `def rotate_right(y):
    x = y.left
    t2 = x.right
    x.right = y
    y.left = t2
    update_height(y)
    update_height(x)
    return x`,
      [
        'A tree rotation re-links O(1) pointers while strictly preserving the in-order BST key sequence.',
        'Zig-zag imbalances (Left-Right or Right-Left) require a double rotation.',
        'Worst-case AVL height is strictly bounded by 1.44 log₂(n).',
      ]
    ),
    quizQuestions: createLessonQuestions('alg_09', 0, 1080, {
      q1Prompt: 'What invariant must hold at every node in an AVL tree?',
      q1Options: [
        'Left and right subtrees must contain the exact same number of nodes',
        'The heights of the left and right child subtrees differ by at most 1',
        'Every leaf must sit at the exact same depth from the root',
        'Left children must always have even keys',
      ],
      q1Correct: 1,
      q1Explanation: 'The AVL balance property requires |height(node.left) - height(node.right)| ≤ 1 for every node in the tree.',
      q2Prompt: 'When a node becomes left-heavy because an insertion occurred into the right subtree of its left child (Left-Right case), how does an AVL tree rebalance?',
      q2Options: [
        'A single right rotation on the unbalanced node',
        'A left rotation on the left child followed by a right rotation on the unbalanced node',
        'Rebuilding the entire tree from scratch in O(n) time',
        'Swapping the root key with the newly inserted leaf',
      ],
      q2Correct: 1,
      q2Explanation: 'A zig-zag Left-Right imbalance is straightened into a Left-Left line via a left rotation on the child, then resolved with a right rotation on the parent.',
    }),
  },
  {
    id: 'alg_10',
    sequenceNumber: 10,
    title: 'Comparison Sort Lower Bounds & Decision Tree Models',
    summaryDescription: 'Use information-theoretic leaf counting on binary decision trees to prove the Omega(n log n) sorting barrier.',
    durationSeconds: 660,
    youtubeVideoId: 'Nz1KZXbghj8',
    startSeconds: 0,
    endSeconds: 660,
    conceptTag: 'Lower Bounds',
    articleMarkdown: buildTechnicalArticle(
      'Decision Trees & The Ω(n log n) Barrier',
      'Any comparison sort can be viewed as a binary decision tree where internal nodes test a_i ≤ a_j and leaves represent final permutations of the n inputs.',
      'Lower Bounds',
      `import math

def min_comparisons(n: int) -> int:
    # Tree must have at least n! leaves: 2^h >= n!
    return math.ceil(math.log2(math.factorial(n)))`,
      [
        'Sorting n distinct items requires distinguishing among all n! possible input permutations.',
        'A binary tree of height h has at most 2^h leaves, forcing h ≥ log₂(n!).',
        'By Stirling’s approximation, log₂(n!) = n log₂ n - Θ(n) = Ω(n log n).',
      ]
    ),
    quizQuestions: createLessonQuestions('alg_10', 0, 660, {
      q1Prompt: 'In the comparison decision tree model for sorting n distinct elements, what is the minimum number of leaves the tree must contain?',
      q1Options: ['2^n leaves', 'n² leaves', 'n! leaves', 'n log n leaves'],
      q1Correct: 2,
      q1Explanation: 'Every one of the n! possible input permutations requires a distinct reachable leaf permutation to sort correctly.',
      q2Prompt: 'What does the height h of a comparison sort’s decision tree represent?',
      q2Options: [
        'The worst-case number of comparisons performed by the sorting algorithm',
        'The auxiliary memory consumption in bytes',
        'The number of duplicate keys in the input array',
        'The average runtime when the array is already sorted',
      ],
      q2Correct: 0,
      q2Explanation: 'A root-to-leaf path traces the sequence of comparisons executed on an input; the longest path (tree height h) is the worst-case comparison count.',
    }),
  },
  {
    id: 'alg_11',
    sequenceNumber: 11,
    title: 'Linear-Time Sorting: Counting Sort & Radix Sort',
    summaryDescription: 'Bypass comparison limits using stable key indexing and multi-pass digit bucketing.',
    durationSeconds: 840,
    youtubeVideoId: 'Nz1KZXbghj8',
    startSeconds: 660,
    endSeconds: 1500,
    conceptTag: 'Linear Sorting',
    articleMarkdown: buildTechnicalArticle(
      'Counting Sort & Least-Significant-Digit Radix Sort',
      'When keys are bounded integers, we can index directly into bucket arrays instead of comparing pairs, breaking the Ω(n log n) comparison barrier.',
      'Linear Sorting',
      `def counting_sort_by_digit(arr, base, exp):
    buckets = [[] for _ in range(base)]
    for num in arr:
        digit = (num // exp) % base
        buckets[digit].append(num)
    return [x for bucket in buckets for x in bucket]`,
      [
        'Counting sort runs in O(n + k) time and space where k is the range of integer keys.',
        'Radix sort processes digits from least significant to most significant using a stable subroutine.',
        'Choosing base b = n sorts integers up to n^d in linear O(d · n) time.',
      ]
    ),
    quizQuestions: createLessonQuestions('alg_11', 660, 1500, {
      q1Prompt: 'Why must the intermediate digit-sorting subroutine inside Least-Significant-Digit (LSD) Radix Sort be stable?',
      q1Options: [
        'To reduce memory usage from O(n) to O(1)',
        'So that ties on the current digit preserve the sorted order already established by less significant digits',
        'Because unstable sorts cannot handle negative integers',
        'To avoid dividing by the radix base b',
      ],
      q1Correct: 1,
      q1Explanation: 'When two numbers share the same most-significant digit, stability guarantees they stay ordered by their previously sorted lower-order digits.',
      q2Prompt: 'If we use Radix Sort with base b = n to sort n integers in the range 0 to n³ - 1, what is the total asymptotic running time?',
      q2Options: ['Θ(n)', 'Θ(n log n)', 'Θ(n²)', 'Θ(n³)'],
      q2Correct: 0,
      q2Explanation: 'In base n, integers up to n³ - 1 have d = 3 digits. Running 3 passes of O(n + n) Counting Sort takes Θ(3n) = Θ(n) linear time.',
    }),
  },
  {
    id: 'alg_12',
    sequenceNumber: 12,
    title: 'Hashing with Chaining & Universal Hash Families',
    summaryDescription: 'Analyze simple uniform hashing, load factor alpha, and the division and multiplication hash methods.',
    durationSeconds: 940,
    youtubeVideoId: '0M_kIqhwbFo',
    startSeconds: 0,
    endSeconds: 940,
    conceptTag: 'Hash Tables',
    articleMarkdown: buildTechnicalArticle(
      'Chained Hash Tables & Load Factor Analysis',
      'Hashing maps a large universe of keys into m table slots. When two keys collide in the same slot, chaining stores them in a short linked list.',
      'Hash Tables',
      `def universal_hash(key: int, a: int, b: int, p: int, m: int) -> int:
    # p is prime > universe size; a in [1..p-1], b in [0..p-1]
    return ((a * key + b) % p) % m`,
      [
        'Load factor α = n / m represents the average number of elements per chain.',
        'Under simple uniform hashing, expected lookup time is Θ(1 + α).',
        'Universal hash families randomize parameters a and b to defeat adversarial inputs.',
      ]
    ),
    quizQuestions: createLessonQuestions('alg_12', 0, 940, {
      q1Prompt: 'In a hash table with m slots storing n elements via chaining, what is the expected time of an unsuccessful search under Simple Uniform Hashing?',
      q1Options: ['Θ(1 + n/m)', 'Θ(log n)', 'Θ(n)', 'Θ(m log n)'],
      q1Correct: 0,
      q1Explanation: 'Hashing the key takes Θ(1) time and scanning the chain at that slot visits an expected α = n/m elements, totaling Θ(1 + α).',
      q2Prompt: 'What guarantee does a Universal Hash Family H provide for any two distinct keys x ≠ y?',
      q2Options: [
        'x and y will never collide for any hash function in H',
        'The probability over a randomly chosen h ∈ H that h(x) == h(y) is at most 1/m',
        'Every chain in the table has length at most 1',
        'Computing h(x) requires zero multiplication operations',
      ],
      q2Correct: 1,
      q2Explanation: 'By choosing h randomly at runtime from a universal family, even worst-case adversarial keys collide with probability ≤ 1/m.',
    }),
  },
  {
    id: 'alg_13',
    sequenceNumber: 13,
    title: 'Table Doubling, Amortized Analysis & Karp-Rabin Rolling Hash',
    summaryDescription: 'Achieve O(1) amortized insertions during dynamic resizing and match substrings in linear time.',
    durationSeconds: 890,
    youtubeVideoId: 'BRO7mVIFt08',
    startSeconds: 0,
    endSeconds: 890,
    conceptTag: 'String Matching',
    articleMarkdown: buildTechnicalArticle(
      'Amortized Table Doubling & Rolling Hashes',
      'Doubling hash table capacity whenever n reaches m costs O(n) for a single resize, but spreads across n insertions for O(1) amortized cost per operation.',
      'String Matching',
      `def step_rolling_hash(prev_hash, old_char, new_char, base, mod, high_pow):
    without_lead = (prev_hash - ord(old_char) * high_pow) % mod
    return (without_lead * base + ord(new_char)) % mod`,
      [
        'Growing table size geometrically (2×) ensures resize costs form a bounded power-of-two sum.',
        'Karp-Rabin treats strings as base-b numbers modulo a prime p.',
        'Sliding the window updates the hash in O(1) time by subtracting the leading character and appending the new tail.',
      ]
    ),
    quizQuestions: createLessonQuestions('alg_13', 0, 890, {
      q1Prompt: 'Why do we double table capacity (m → 2m) instead of incrementing by a constant (m → m + 100) when growing a dynamic hash table?',
      q1Options: [
        'Because incrementing by a constant causes total resize work over n insertions to become Θ(n²), whereas doubling keeps it Θ(n)',
        'Because hash functions only work on powers of 10',
        'To avoid rehashing existing keys during the resize',
        'Because linked lists cannot exceed 100 elements',
      ],
      q1Correct: 0,
      q1Explanation: 'Geometric doubling means resizing happens at powers of 2 (1 + 2 + 4 + ... + n ≤ 2n), giving Θ(1) amortized cost per insertion.',
      q2Prompt: 'How quickly does the Karp-Rabin rolling hash update the hash value when sliding a pattern window of length L by one character?',
      q2Options: ['O(1) time', 'O(L) time', 'O(log L) time', 'O(L²) time'],
      q2Correct: 0,
      q2Explanation: 'Subtracting the outgoing high-order character, multiplying by the base, and adding the incoming character takes constant O(1) arithmetic operations.',
    }),
  },
  {
    id: 'alg_14',
    sequenceNumber: 14,
    title: 'Open Addressing, Linear Probing & Cryptographic Hashing',
    summaryDescription: 'Eliminate pointer chains via probing sequences and avoid primary clustering pathologies.',
    durationSeconds: 810,
    youtubeVideoId: 'rvdJDijO2Ro',
    startSeconds: 0,
    endSeconds: 810,
    conceptTag: 'Open Addressing',
    articleMarkdown: buildTechnicalArticle(
      'Open Addressing & Tombstone Deletions',
      'Open addressing stores all keys directly inside the slot array. On collision, a deterministic probe sequence searches for the next open slot.',
      'Open Addressing',
      `def double_hash_probe(key: int, i: int, m: int) -> int:
    h1 = key % m
    h2 = 1 + (key % (m - 1))
    return (h1 + i * h2) % m`,
      [
        'Linear probing suffers from primary clustering when consecutive occupied runs coalesce.',
        'Deleting an open-addressed key requires placing a DELETED tombstone marker so searches do not terminate early.',
        'Keeping load factor α ≤ 0.5 ensures expected constant probe lengths.',
      ]
    ),
    quizQuestions: createLessonQuestions('alg_14', 0, 810, {
      q1Prompt: 'Why can’t we simply overwrite a deleted key’s slot with None in an open-addressed hash table?',
      q1Options: [
        'Because setting the slot to None would prematurely terminate probe searches for keys inserted later along the same collision chain',
        'Because None occupies more memory than an integer key',
        'Because open addressing does not allow duplicate insertions',
        'Because it would change the prime table size m',
      ],
      q1Correct: 0,
      q1Explanation: 'A tombstone (DELETED) marker tells future lookups to keep probing past the vacated slot while allowing future insertions to reuse it.',
      q2Prompt: 'What condition must the secondary step size h₂(k) satisfy in Double Hashing so that every slot in a table of size m can be probed?',
      q2Options: [
        'h₂(k) must be relatively prime (coprime) to table size m',
        'h₂(k) must always equal 0',
        'h₂(k) must be an even multiple of m',
        'h₂(k) must be greater than m²',
      ],
      q2Correct: 0,
      q2Explanation: 'If gcd(h₂(k), m) = 1, the probe sequence h₁(k) + i · h₂(k) (mod m) visits all m slots before repeating.',
    }),
  },
  {
    id: 'alg_15',
    sequenceNumber: 15,
    title: 'Breadth-First Search (BFS), Graph Representations & Shortest Paths',
    summaryDescription: 'Model adjacency lists and explore level-by-level frontier queues to solve unweighted shortest paths.',
    durationSeconds: 980,
    youtubeVideoId: 's-CYnVz-uh4',
    startSeconds: 0,
    endSeconds: 980,
    conceptTag: 'Graph Traversal',
    articleMarkdown: buildTechnicalArticle(
      'Breadth-First Search & Frontier Discovery',
      'Breadth-First Search explores a graph outward from a source vertex s in concentric layers, discovering all vertices at distance k before any at distance k + 1.',
      'Graph Traversal',
      `from collections import deque

def bfs_shortest_paths(adj, start):
    dist = {start: 0}
    queue = deque([start])
    while queue:
        u = queue.popleft()
        for v in adj[u]:
            if v not in dist:
                dist[v] = dist[u] + 1
                queue.append(v)
    return dist`,
      [
        'Adjacency lists use Θ(V + E) space, ideal for sparse real-world networks.',
        'Every vertex is enqueued at most once and every edge is inspected at most twice, giving O(V + E) runtime.',
        'Parent pointers form a shortest-path tree rooted at s.',
      ]
    ),
    quizQuestions: createLessonQuestions('alg_15', 0, 980, {
      q1Prompt: 'What is the worst-case time complexity of Breadth-First Search (BFS) on a graph represented with adjacency lists?',
      q1Options: ['O(V + E)', 'O(V²)', 'O(E log V)', 'O(V · E)'],
      q1Correct: 0,
      q1Explanation: 'BFS visits each of the V vertices at most once and scans each vertex’s adjacency list once, totaling O(V + E) work.',
      q2Prompt: 'Which data structure manages the active frontier of discovered vertices in Breadth-First Search?',
      q2Options: [
        'A First-In, First-Out (FIFO) queue',
        'A Last-In, First-Out (LIFO) stack',
        'A binary search tree',
        'A disjoint-set union forest',
      ],
      q2Correct: 0,
      q2Explanation: 'A FIFO queue ensures vertices discovered at distance k are fully expanded before any vertices at distance k + 1.',
    }),
  },
  {
    id: 'alg_16',
    sequenceNumber: 16,
    title: 'Depth-First Search (DFS), Edge Classification & Topological Sort',
    summaryDescription: 'Detect cycles via back edges and schedule directed acyclic dependency graphs (DAGs).',
    durationSeconds: 950,
    youtubeVideoId: 'AfSk24UTFS8',
    startSeconds: 0,
    endSeconds: 950,
    conceptTag: 'Graph Traversal',
    articleMarkdown: buildTechnicalArticle(
      'Depth-First Search & Topological Ordering',
      'DFS plunges as deep as possible along each branch before backtracking, recording discovery and finish timestamps for every vertex.',
      'Graph Traversal',
      `def topological_sort(adj):
    visited, order = set(), []
    def dfs(u):
        visited.add(u)
        for v in adj.get(u, []):
            if v not in visited:
                dfs(v)
        order.append(u)
    for node in adj:
        if node not in visited:
            dfs(node)
    return order[::-1]`,
      [
        'A directed graph is acyclic (a DAG) if and only if DFS yields zero back edges.',
        'Reversing the post-order finish sequence produces a valid topological schedule.',
        'Total runtime across all disconnected components remains strictly O(V + E).',
      ]
    ),
    quizQuestions: createLessonQuestions('alg_16', 0, 950, {
      q1Prompt: 'In Depth-First Search on a directed graph, the presence of which edge type proves that the graph contains a cycle?',
      q1Options: ['Tree edge', 'Forward edge', 'Cross edge', 'Back edge'],
      q1Correct: 3,
      q1Explanation: 'A back edge connects a vertex u to an ancestor v that is currently active on the recursion stack, completing a directed cycle.',
      q2Prompt: 'How do we obtain a valid topological sort of a Directed Acyclic Graph (DAG) from Depth-First Search?',
      q2Options: [
        'Order vertices in reverse of their DFS finish times',
        'Order vertices by their BFS distance from the first node',
        'Order vertices by their in-degree multiplied by out-degree',
        'Order vertices in the exact order they are first discovered',
      ],
      q2Correct: 0,
      q2Explanation: 'For any directed edge u → v in a DAG, v finishes before u in DFS; reversing finish times places u before v.',
    }),
  },
  {
    id: 'alg_17',
    sequenceNumber: 17,
    title: 'Single-Source Shortest Paths: Relaxation & Dijkstra’s Algorithm',
    summaryDescription: 'Maintain priority-queue distance estimates on non-negative weighted graphs in O(E + V log V) time.',
    durationSeconds: 1050,
    youtubeVideoId: '2E7MmKv0Y24',
    startSeconds: 0,
    endSeconds: 1050,
    conceptTag: 'Shortest Paths',
    articleMarkdown: buildTechnicalArticle(
      'Edge Relaxation & Dijkstra’s Greedy Invariant',
      'When all edge weights are non-negative, extracting the unvisited vertex with the minimum tentative distance guarantees its shortest path is permanently settled.',
      'Shortest Paths',
      `import heapq

def dijkstra(adj, source):
    dist = {source: 0}
    pq = [(0, source)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist.get(u, float('inf')):
            continue
        for v, weight in adj.get(u, []):
            if d + weight < dist.get(v, float('inf')):
                dist[v] = d + weight
                heapq.heappush(pq, (dist[v], v))
    return dist`,
      [
        'Edge relaxation tests whether routing through u improves the best known path to v.',
        'Negative weight edges break Dijkstra’s greedy assumption and require Bellman-Ford.',
        'Binary min-heaps yield O((V + E) log V) total complexity.',
      ]
    ),
    quizQuestions: createLessonQuestions('alg_17', 0, 1050, {
      q1Prompt: 'What precondition on edge weights is required for Dijkstra’s algorithm to guarantee correct shortest paths?',
      q1Options: [
        'All edge weights must be non-negative (w(u, v) ≥ 0)',
        'All edge weights must be strictly equal to 1',
        'The graph must be a binary tree',
        'Edge weights must be sorted in decreasing order',
      ],
      q1Correct: 0,
      q1Explanation: 'Non-negative edge weights ensure that any detour through unvisited vertices can only increase path length, making the minimum queue extraction final.',
      q2Prompt: 'What does the relaxation step Relax(u, v, w) do during shortest-path search?',
      q2Options: [
        'Tests whether d[v] > d[u] + w(u, v) and, if so, updates d[v] = d[u] + w(u, v)',
        'Removes edge (u, v) permanently from the graph',
        'Swaps the vertex labels of u and v',
        'Resets all tentative distances back to infinity',
      ],
      q2Correct: 0,
      q2Explanation: 'Relaxation tightens the upper-bound distance estimate d[v] whenever a shorter route through u is discovered.',
    }),
  },
  {
    id: 'alg_18',
    sequenceNumber: 18,
    title: 'Dynamic Programming I: Memoization, Fibonacci & Shortest Paths',
    summaryDescription: 'Trade space for time by caching overlapping subproblems and unrolling DAG relaxations.',
    durationSeconds: 1120,
    youtubeVideoId: 'OQ5jsbhAv_M',
    startSeconds: 0,
    endSeconds: 1120,
    conceptTag: 'Dynamic Programming',
    articleMarkdown: buildTechnicalArticle(
      'Memoization & Bottom-Up Dynamic Programming',
      'Dynamic Programming solves optimization problems exhibiting optimal substructure and overlapping subproblems by solving each unique state exactly once.',
      'Dynamic Programming',
      `def fib_bottom_up(n: int) -> int:
    if n <= 1:
        return n
    prev2, prev1 = 0, 1
    for _ in range(2, n + 1):
        prev2, prev1 = prev1, prev2 + prev1
    return prev1`,
      [
        'Total DP runtime equals (# of unique subproblems) × (work per subproblem excluding recursive calls).',
        'Subproblem dependencies must form a DAG; cyclic dependencies invalidate memoization.',
        'Bottom-up tabulation often allows discarding old rows to reduce space to O(1).',
      ]
    ),
    quizQuestions: createLessonQuestions('alg_18', 0, 1120, {
      q1Prompt: 'How does memoizing the recursive Fibonacci function change its time complexity from naive recursion?',
      q1Options: [
        'From exponential O(φ^n) down to linear Θ(n)',
        'From Θ(n²) down to Θ(log n)',
        'From Θ(n log n) down to Θ(1)',
        'It only reduces space complexity without changing time complexity',
      ],
      q1Correct: 0,
      q1Explanation: 'Caching F(k) on first evaluation collapses the exponential tree of redundant calls into n distinct subproblems each taking O(1) addition work.',
      q2Prompt: 'What structural property must the dependency graph of subproblems satisfy for Dynamic Programming to apply?',
      q2Options: [
        'It must be a Directed Acyclic Graph (DAG)',
        'It must contain a Hamiltonian cycle through all states',
        'It must be a complete bipartite graph',
        'Every subproblem must depend on at least 4 other subproblems',
      ],
      q2Correct: 0,
      q2Explanation: 'If subproblem A depends on B and B depends on A, there is no acyclic evaluation order for memoization or bottom-up tabulation.',
    }),
  },
];

const karpathyNeuralNetsLessons: Lesson[] = [
  {
    id: 'nn_01',
    sequenceNumber: 1,
    title: 'Scalar Value Intuition & Numerical Derivative Verification',
    summaryDescription: 'Inspect finite difference slopes (f(x + h) - f(x)) / h to build physical intuition for sensitivity and derivatives.',
    durationSeconds: 840,
    youtubeVideoId: 'VMj-3S1tku0',
    startSeconds: 0,
    endSeconds: 840,
    conceptTag: 'Calculus Intuition',
    articleMarkdown: buildTechnicalArticle(
      'Numerical Derivatives & Local Linear Sensitivity',
      'Before writing symbolic autograd engines, we can estimate the derivative of any scalar function f(x) by nudging an input by a tiny step h and measuring the resulting change in output.',
      'Calculus Intuition',
      `def numerical_grad(f, x: float, h: float = 1e-6) -> float:
    return (f(x + h) - f(x - h)) / (2 * h)`,
      [
        'The sign of the derivative tells us whether nudging x upward increases or decreases the output.',
        'The magnitude indicates the leverage or sensitivity of the output to that specific parameter.',
        'Centered finite differences provide a fast unit test against analytical backprop bugs.',
      ]
    ),
    quizQuestions: createLessonQuestions('nn_01', 0, 840, {
      q1Prompt: 'What does a derivative ∂L/∂w = -3.5 tell us about the relationship between weight w and scalar loss L?',
      q1Options: [
        'Increasing w by a tiny positive step h will decrease L at an instantaneous rate of 3.5h',
        'The weight w currently has a value of -3.5',
        'The loss L is guaranteed to be negative',
        'Increasing w will increase L by 3.5 units regardless of step size',
      ],
      q1Correct: 0,
      q1Explanation: 'A negative local slope means nudging w slightly in the positive direction pushes the output L downward by approximately 3.5 × h.',
      q2Prompt: 'Why is the symmetric difference quotient (f(x + h) - f(x - h)) / (2h) preferred over (f(x + h) - f(x)) / h for gradient checking?',
      q2Options: [
        'It cancels out second-order Taylor error terms, giving O(h²) accuracy instead of O(h)',
        'It only requires evaluating the function f once',
        'It avoids floating-point division',
        'It works even when h is set to 0',
      ],
      q2Correct: 0,
      q2Explanation: 'Centered finite differences cancel the f′′(x)h² term in the Taylor expansion, yielding much higher numerical accuracy.',
    }),
  },
  {
    id: 'nn_02',
    sequenceNumber: 2,
    title: 'Building the Micrograd Value Object & Expression Graph',
    summaryDescription: 'Wrap Python floats in a custom node class that records child operands and operator symbols.',
    durationSeconds: 960,
    youtubeVideoId: 'VMj-3S1tku0',
    startSeconds: 840,
    endSeconds: 1800,
    conceptTag: 'Computation Graphs',
    articleMarkdown: buildTechnicalArticle(
      'Constructing Dynamic Computation Graphs',
      'Micrograd tracks mathematical expressions by wrapping raw scalar numbers inside a Value object that remembers which parent nodes produced it.',
      'Computation Graphs',
      `class Value:
    def __init__(self, data, _children=(), _op=''):
        self.data = data
        self.grad = 0.0
        self._prev = set(_children)
        self._op = _op

    def __add__(self, other):
        return Value(self.data + other.data, (self, other), '+')`,
      [
        'Forward pass operations build a directed acyclic graph (DAG) on the fly.',
        'Each node initializes self.grad = 0.0 to store ∂L / ∂node during the backward pass.',
        'Operator overloading (__add__, __mul__) makes graph construction read like standard math.',
      ]
    ),
    quizQuestions: createLessonQuestions('nn_02', 840, 1800, {
      q1Prompt: 'What is the purpose of storing _prev (the set of child operands) inside every Micrograd Value node?',
      q1Options: [
        'To reconstruct the forward expression graph so gradients can propagate backward to inputs',
        'To garbage-collect unused Python floats during the forward pass',
        'To sort weights in ascending numerical order',
        'To prevent two Value nodes from having the same float value',
      ],
      q1Correct: 0,
      q1Explanation: 'Recording the operand pointers that produced each intermediate Value constructs the computation DAG needed for reverse-mode autodiff.',
      q2Prompt: 'What value is self.grad initialized to when a new Value node is created?',
      q2Options: ['0.0', '1.0', '-1.0', 'None'],
      q2Correct: 0,
      q2Explanation: 'Before backpropagation runs, each node starts with 0.0 accumulated gradient so upstream contributions can be summed cleanly.',
    }),
  },
  {
    id: 'nn_03',
    sequenceNumber: 3,
    title: 'Manual Backpropagation & Applying the Multivariate Chain Rule',
    summaryDescription: 'Propagate gradients backward through addition, multiplication, and hyperbolic tangent activation gates.',
    durationSeconds: 1020,
    youtubeVideoId: 'VMj-3S1tku0',
    startSeconds: 1800,
    endSeconds: 2820,
    conceptTag: 'Backpropagation',
    articleMarkdown: buildTechnicalArticle(
      'Local Gate Jacobians & The Chain Rule',
      'Backpropagation is a recursive application of the chain rule: each node multiplies its incoming upstream gradient by the local derivative of its operation.',
      'Backpropagation',
      `# Local backward closures inside Value operations
def _backward_mul():
    self.grad += other.data * out.grad
    other.grad += self.data * out.grad`,
      [
        'An addition gate (+) acts as a gradient router, passing upstream gradients unchanged to both inputs.',
        'A multiplication gate (*) acts as a swapped switcher, scaling each input gradient by the other operand’s value.',
        'For tanh(x), the local derivative simplifies cleanly to 1 - tanh²(x).',
      ]
    ),
    quizQuestions: createLessonQuestions('nn_03', 1800, 2820, {
      q1Prompt: 'If out = a * b where a.data = 3.0, b.data = -4.0, and out.grad = 2.0, what gradient is propagated to a.grad?',
      q1Options: ['-8.0', '6.0', '2.0', '-12.0'],
      q1Correct: 0,
      q1Explanation: 'For multiplication out = a * b, ∂out/∂a = b.data = -4.0. By the chain rule, a.grad += b.data * out.grad = -4.0 * 2.0 = -8.0.',
      q2Prompt: 'How does an addition gate out = a + b transform the incoming upstream gradient out.grad?',
      q2Options: [
        'It routes out.grad unchanged (multiplied by 1.0) to both a.grad and b.grad',
        'It splits out.grad in half between a and b',
        'It multiplies out.grad by a.data + b.data',
        'It zeroes out the smaller operand’s gradient',
      ],
      q2Correct: 0,
      q2Explanation: 'Since ∂(a + b)/∂a = 1 and ∂(a + b)/∂b = 1, an addition node distributes the exact upstream gradient to both branches.',
    }),
  },
  {
    id: 'nn_04',
    sequenceNumber: 4,
    title: 'Topological Ordering & Automating backward() Across a DAG',
    summaryDescription: 'Fix gradient accumulation bugs when variables are reused multiple times by accumulating += local gradients.',
    durationSeconds: 910,
    youtubeVideoId: 'VMj-3S1tku0',
    startSeconds: 2820,
    endSeconds: 3730,
    conceptTag: 'Autograd Engine',
    articleMarkdown: buildTechnicalArticle(
      'Topological Graph Traversal for Automatic Differentiation',
      'To automate backpropagation from the root loss node, we must ensure every node receives all upstream gradient contributions before propagating further backward.',
      'Autograd Engine',
      `def backward(self):
    topo, visited = [], set()
    def build_topo(v):
        if v not in visited:
            visited.add(v)
            for child in v._prev:
                build_topo(child)
            topo.append(v)
    build_topo(self)
    self.grad = 1.0
    for node in reversed(topo):
        node._backward()`,
      [
        'Reversed topological order guarantees all downstream consumers have finished before a parent runs _backward().',
        'Using += instead of = is mandatory whenever a variable branches into multiple expressions.',
        'Setting root.grad = 1.0 seeds the base case ∂L / ∂L = 1.',
      ]
    ),
    quizQuestions: createLessonQuestions('nn_04', 2820, 3730, {
      q1Prompt: 'What bug occurs in backpropagation if we write self.grad = ... instead of self.grad += ... inside _backward()?',
      q1Options: [
        'When a node is used more than once in an expression (like b = a + a), the second branch overwrites the first branch’s gradient instead of summing them',
        'Python raises a SyntaxError on closure variables',
        'The forward pass output is doubled',
        'Topological sort enters an infinite loop',
      ],
      q1Correct: 0,
      q1Explanation: 'By the multivariate chain rule, gradients from all outgoing paths must be summed (+=) at any node that fans out to multiple consumers.',
      q2Prompt: 'Why must _backward() be called in reverse topological order starting from the loss node?',
      q2Options: [
        'So that a node’s full upstream gradient is completely accumulated before it propagates gradients to its own children',
        'To reduce memory usage of the Python list',
        'Because leaf weights do not have a _backward closure',
        'So that activations are recomputed in the forward direction',
      ],
      q2Correct: 0,
      q2Explanation: 'Reverse topological order guarantees every parent expression has already contributed to node.grad before node._backward() executes.',
    }),
  },
  {
    id: 'nn_05',
    sequenceNumber: 5,
    title: 'Constructing Neurons, Layers, and an MLP in Pure Python',
    summaryDescription: 'Assemble a multi-layer perceptron from our Value class and run a complete gradient descent optimization loop.',
    durationSeconds: 1140,
    youtubeVideoId: 'VMj-3S1tku0',
    startSeconds: 3730,
    endSeconds: 4870,
    conceptTag: 'Multi-Layer Perceptrons',
    articleMarkdown: buildTechnicalArticle(
      'From Scalar Values to Multi-Layer Perceptrons',
      'A single artificial neuron computes a weighted sum of inputs plus a bias, passed through a non-linear activation function.',
      'Multi-Layer Perceptrons',
      `for step in range(50):
    preds = [model(x) for x in xs]
    loss = sum((yp - ygt) ** 2 for ygt, yp in zip(ys, preds))
    for p in model.parameters():
        p.grad = 0.0
    loss.backward()
    for p in model.parameters():
        p.data += -0.05 * p.grad`,
      [
        'Zeroing gradients before each backward pass prevents stale gradient accumulation across steps.',
        'Stepping in the negative gradient direction (-lr * grad) minimizes scalar loss.',
        'Non-linear activations between linear layers allow MLPs to approximate non-convex boundaries.',
      ]
    ),
    quizQuestions: createLessonQuestions('nn_05', 3730, 4870, {
      q1Prompt: 'What happens during training if you forget to reset p.grad = 0.0 before calling loss.backward() on each step?',
      q1Options: [
        'Gradients from previous training steps accumulate into current gradients, causing erratic oversized parameter updates',
        'The parameters freeze and stop updating',
        'The learning rate automatically decays to zero',
        'The loss immediately drops to 0.0',
      ],
      q1Correct: 0,
      q1Explanation: 'Because _backward() uses += to accumulate gradients, failing to zero p.grad sums gradients across all historical iterations.',
      q2Prompt: 'Why do we update parameters using p.data += -lr * p.grad with a negative sign?',
      q2Options: [
        'Because p.grad points in the direction of steepest ascent of the loss, and we want to minimize the loss',
        'Because learning rates in Python are stored as negative floats',
        'To increase the L2 norm of the weight matrix',
        'Because squared error loss is always negative',
      ],
      q2Correct: 0,
      q2Explanation: 'The gradient vector points uphill toward higher loss; stepping in the opposite direction (-lr * grad) descends the loss surface.',
    }),
  },
  {
    id: 'nn_06',
    sequenceNumber: 6,
    title: 'Introduction to makemore: Character-Level Bigram Language Models',
    summaryDescription: 'Explore dataset statistics over 32,000 names and build a 2D lookup table of transition counts in PyTorch.',
    durationSeconds: 950,
    youtubeVideoId: 'PaCmpygFfXo',
    startSeconds: 0,
    endSeconds: 950,
    conceptTag: 'Language Modeling',
    articleMarkdown: buildTechnicalArticle(
      'Bigram Transition Matrices & Multinomial Sampling',
      'A character-level bigram language model predicts the next character in a sequence given only the single immediately preceding character.',
      'Language Modeling',
      `import torch

N = torch.zeros((27, 27), dtype=torch.int32)
# Normalize rows into probability distributions
P = (N + 1).float()
P /= P.sum(dim=1, keepdim=True)`,
      [
        'A single special token (.) serves as both start-of-word and end-of-word boundary marker.',
        'keepdim=True ensures row sums broadcast properly across columns during division.',
        'Adding +1 count smoothing prevents zero-probability infinite loss on unseen bigrams.',
      ]
    ),
    quizQuestions: createLessonQuestions('nn_06', 0, 950, {
      q1Prompt: 'Why is keepdim=True critical when normalizing rows of the 27×27 bigram count matrix via P /= P.sum(dim=1, keepdim=True)?',
      q1Options: [
        'Without keepdim=True, P.sum(dim=1) has shape (27,) which broadcasts across rows as a column vector, normalizing columns instead of rows',
        'PyTorch raises a RuntimeError if keepdim is omitted',
        'keepdim=True converts integer counts into 64-bit floats',
        'It sorts each row in descending probability order',
      ],
      q1Correct: 0,
      q1Explanation: 'keepdim=True preserves shape (27, 1) so each row is divided by its own row sum rather than broadcasting (27,) into (1, 27) and dividing columns.',
      q2Prompt: 'Why do we add +1 to every cell of the bigram count matrix N before normalizing probabilities (model smoothing)?',
      q2Options: [
        'To ensure no character transition has 0 probability, preventing -log(0) = ∞ loss on unseen test bigrams',
        'To make the matrix invertible for matrix multiplication',
        'To double the sampling speed of torch.multinomial',
        'Because PyTorch tensors cannot store zeros',
      ],
      q2Correct: 0,
      q2Explanation: 'Laplace (+1) smoothing guarantees strictly positive probabilities everywhere, avoiding infinite negative log-likelihood on rare bigrams.',
    }),
  },
  {
    id: 'nn_07',
    sequenceNumber: 7,
    title: 'Negative Log-Likelihood Loss, Label Smoothing & Tensor Broadcasting',
    summaryDescription: 'Evaluate model quality with average NLL and master subtle PyTorch broadcasting semantics.',
    durationSeconds: 1080,
    youtubeVideoId: 'PaCmpygFfXo',
    startSeconds: 950,
    endSeconds: 2030,
    conceptTag: 'Loss Functions',
    articleMarkdown: buildTechnicalArticle(
      'Negative Log-Likelihood (NLL) Evaluation',
      'Maximum likelihood estimation seeks model parameters that maximize the product of predicted probabilities assigned to ground-truth targets.',
      'Loss Functions',
      `log_prob = torch.log(probs[torch.arange(num), ys])
nll_loss = -log_prob.mean()`,
      [
        'Taking logs turns products of tiny probabilities into stable sums of log-likelihoods.',
        'Negating the average log-likelihood produces a loss where 0.0 is a perfect prediction.',
        'Vectorized tensor indexing replaces slow Python loops over training examples.',
      ]
    ),
    quizQuestions: createLessonQuestions('nn_07', 950, 2030, {
      q1Prompt: 'If a model assigns probability 1.0 to every ground-truth next character in the dataset, what is its Negative Log-Likelihood (NLL) loss?',
      q1Options: ['0.0', '1.0', '-1.0', '∞'],
      q1Correct: 0,
      q1Explanation: 'Since log(1.0) = 0.0, the average negative log-likelihood of a perfect predictor reaches the minimum possible loss of 0.0.',
      q2Prompt: 'Why do we optimize the sum of log-probabilities rather than the raw product of probabilities across a dataset?',
      q2Options: [
        'Multiplying thousands of probabilities in (0, 1) rapidly underflows floating-point precision to 0.0, whereas log turns products into stable sums',
        'Logarithms convert non-linear functions into linear matrices',
        'Raw probabilities cannot be differentiated',
        'The product of probabilities is always greater than 1',
      ],
      q2Correct: 0,
      q2Explanation: 'Monotonic log transformation prevents numerical underflow while preserving the exact location of the parameter optimum.',
    }),
  },
  {
    id: 'nn_08',
    sequenceNumber: 8,
    title: 'Casting Bigram Counting into a Single-Layer Neural Network',
    summaryDescription: 'One-hot encode character indices and verify that gradient descent on logits converges to the exact counting table.',
    durationSeconds: 990,
    youtubeVideoId: 'PaCmpygFfXo',
    startSeconds: 2030,
    endSeconds: 3020,
    conceptTag: 'Neural Equivalence',
    articleMarkdown: buildTechnicalArticle(
      'Softmax Layer Equivalence to Empirical Counting',
      'Passing one-hot vectors x_enc through a linear weight matrix W produces unnormalized log-counts (logits), which softmax converts into valid probability distributions.',
      'Neural Equivalence',
      `import torch.nn.functional as F

xenc = F.one_hot(xs, num_classes=27).float()
logits = xenc @ W
counts = logits.exp()
probs = counts / counts.sum(1, keepdim=True)`,
      [
        'Multiplying a one-hot row vector by W simply plucks out the corresponding row of W.',
        'Exponentiating logits guarantees strictly positive values prior to normalization.',
        'L2 weight decay (W**2).mean() acts identically to additive count smoothing.',
      ]
    ),
    quizQuestions: createLessonQuestions('nn_08', 2030, 3020, {
      q1Prompt: 'What is the geometric effect of multiplying a 27-dimensional one-hot row vector (with a 1 at index i) by a 27×27 weight matrix W?',
      q1Options: [
        'It selects and returns the i-th row of matrix W',
        'It transposes matrix W',
        'It zeroes out the i-th row of matrix W',
        'It computes the determinant of W',
      ],
      q1Correct: 0,
      q1Explanation: 'One-hot multiplication acts as a differentiable table lookup, extracting row i of W corresponding to the active input token.',
      q2Prompt: 'In the single-layer bigram neural network, what is the effect of adding L2 regularization λ(W²).mean() to the loss?',
      q2Options: [
        'It pushes weights W toward 0, making predicted probability distributions more uniform (equivalent to stronger count smoothing)',
        'It forces all probabilities to become one-hot vectors',
        'It doubles the effective learning rate',
        'It increases the vocabulary size beyond 27',
      ],
      q2Correct: 0,
      q2Explanation: 'When W = 0, exp(W) = 1 everywhere, producing a completely uniform distribution just like adding large smoothing counts.',
    }),
  },
  {
    id: 'nn_09',
    sequenceNumber: 9,
    title: 'Bengio et al. (2003) MLP Architecture & Learned Token Embeddings',
    summaryDescription: 'Project discrete tokens into a dense continuous vector space to generalize across unseen character contexts.',
    durationSeconds: 1050,
    youtubeVideoId: 'TCH_1BHY58I',
    startSeconds: 0,
    endSeconds: 1050,
    conceptTag: 'Embeddings',
    articleMarkdown: buildTechnicalArticle(
      'Distributed Feature Vectors & Context Windows',
      'As context length grows, n-gram tables explode exponentially. Embedding characters into low-dimensional vectors lets similar characters share statistical strength.',
      'Embeddings',
      `C = torch.randn((27, 10))
emb = C[Xb]  # shape: (batch_size, block_size, 10)
h = torch.tanh(emb.view(-1, 30) @ W1 + b1)
logits = h @ W2 + b2`,
      [
        'Indexing C[Xb] embeds an entire batch of context windows simultaneously.',
        'Using .view(-1, 30) concatenates the three 10-D context vectors without copying memory.',
        'F.cross_entropy fuses log-softmax and NLL loss for numerical stability.',
      ]
    ),
    quizQuestions: createLessonQuestions('nn_09', 0, 1050, {
      q1Prompt: 'If batch input Xb has shape (32, 3) and embedding table C has shape (27, 10), what is the shape of the embedded tensor C[Xb]?',
      q1Options: ['(32, 3, 10)', '(27, 32, 10)', '(32, 30)', '(3, 10)'],
      q1Correct: 0,
      q1Explanation: 'PyTorch advanced indexing replaces each integer index in the (32, 3) tensor with its corresponding 10-dimensional embedding vector, giving (32, 3, 10).',
      q2Prompt: 'Why should you always prefer F.cross_entropy(logits, targets) over manually calling logits.exp() and torch.log()?',
      q2Options: [
        'F.cross_entropy subtracts the maximum logit internally so large positive logits never overflow float32 to infinity during exp()',
        'F.cross_entropy skips computing gradients for the output layer',
        'Manual exp() only works on CPU tensors',
        'F.cross_entropy automatically shuffles the training dataset',
      ],
      q2Correct: 0,
      q2Explanation: 'Using the log-sum-exp trick (shifting logits by -max(logits)) prevents numerical overflow while keeping probabilities mathematically identical.',
    }),
  },
  {
    id: 'nn_10',
    sequenceNumber: 10,
    title: 'Mini-Batch Training, Learning Rate Schedules & Train/Val/Test Splits',
    summaryDescription: 'Tune learning rates empirically and partition datasets strictly to prevent overfitting as parameter counts scale.',
    durationSeconds: 940,
    youtubeVideoId: 'TCH_1BHY58I',
    startSeconds: 1050,
    endSeconds: 1990,
    conceptTag: 'Optimization',
    articleMarkdown: buildTechnicalArticle(
      'Stochastic Mini-Batches & Dataset Hygiene',
      'Computing exact gradients over 200,000 examples per step is prohibitively slow. Sampling random mini-batches of 32 or 64 examples yields noisy but fast updates.',
      'Optimization',
      `ix = torch.randint(0, Xtr.shape[0], (64,))
loss = F.cross_entropy(logits[ix], Ytr[ix])`,
      [
        'Split data into 80% Train (optimize weights), 10% Validation (tune hyperparameters), and 10% Test.',
        'Sweep learning rates exponentially from 10⁻³ to 10⁰ to find the steepest stable descent region.',
        'Decay the learning rate by 10× near the end of training to settle into a local minimum.',
      ]
    ),
    quizQuestions: createLessonQuestions('nn_10', 1050, 1990, {
      q1Prompt: 'What does it indicate when a neural network’s training loss and validation loss are nearly identical and both remain high?',
      q1Options: [
        'The model is underfitting and lacks capacity (or needs longer training) rather than overfitting',
        'The model has memorized the training set',
        'The validation split was accidentally deleted',
        'The learning rate is infinite',
      ],
      q1Correct: 0,
      q1Explanation: 'Equal train and validation loss means the network is not overfitting; scaling up hidden layer size or embedding dimension can reduce both.',
      q2Prompt: 'Why must the test split be evaluated only sparingly at the very end of experimentation?',
      q2Options: [
        'Because repeatedly tuning hyperparameters against the test set leaks test information and invalidates generalization estimates',
        'Because evaluating the test set modifies model weights',
        'Because PyTorch deletes the test tensor after one forward pass',
        'Because test splits only contain 1 example',
      ],
      q2Correct: 0,
      q2Explanation: 'Every decision made based on a dataset fits implicit hyperparameters to that split; the test set must remain untouched to measure true generalization.',
    }),
  },
  {
    id: 'nn_11',
    sequenceNumber: 11,
    title: 'Activation Saturation, Dead Neurons & Kaiming Initialization',
    summaryDescription: 'Diagnose vanishing gradients when tanh pre-activations explode at initialization and scale weights by fan-in.',
    durationSeconds: 1100,
    youtubeVideoId: 'P6sfmUTpUmc',
    startSeconds: 0,
    endSeconds: 1100,
    conceptTag: 'Initialization',
    articleMarkdown: buildTechnicalArticle(
      'Preventing Saturated Activations at Initialization',
      'If initial weights are too large, hidden pre-activations land in the flat tails of tanh where 1 - t² ≈ 0, killing gradient flow on step 1.',
      'Initialization',
      `# Kaiming normal initialization for tanh (gain = 5/3)
fan_in = 30
W1 = torch.randn(fan_in, 200) * ((5 / 3) / (fan_in ** 0.5))`,
      [
        'Dividing initial random weights by √fan_in preserves unit variance across linear layers.',
        'A neuron whose activation is always ±1 across the entire dataset is permanently dead.',
        'Scaling down the final output layer weights ensures uniform initial predictions and avoids hockey-stick loss.',
      ]
    ),
    quizQuestions: createLessonQuestions('nn_11', 0, 1100, {
      q1Prompt: 'What happens to the backward gradient through a tanh(x) neuron when its pre-activation x is very large (e.g., |x| > 5)?',
      q1Options: [
        'tanh(x) saturates near ±1, so the local derivative 1 - tanh²(x) becomes ~0 and vanishes the gradient',
        'The gradient explodes to infinity',
        'The neuron converts into a linear identity gate',
        'The weight matrix automatically resets to zeros',
      ],
      q1Correct: 0,
      q1Explanation: 'In the flat tails of tanh where output t ≈ ±1, the derivative 1 - t² ≈ 0 blocks upstream gradients from flowing through the neuron.',
      q2Prompt: 'By what factor does Kaiming initialization scale standard normal random weights for a layer with fan_in inputs?',
      q2Options: ['gain / √fan_in', 'fan_in²', '1 / fan_out', 'log(fan_in)'],
      q2Correct: 0,
      q2Explanation: 'Dividing by √fan_in keeps the variance of the weighted sum constant regardless of how many inputs feed into the layer.',
    }),
  },
  {
    id: 'nn_12',
    sequenceNumber: 12,
    title: 'Batch Normalization: Stabilizing Deep Network Internal Distributions',
    summaryDescription: 'Normalize hidden states across the batch dimension and maintain exponentially weighted running buffers.',
    durationSeconds: 1040,
    youtubeVideoId: 'P6sfmUTpUmc',
    startSeconds: 1100,
    endSeconds: 2140,
    conceptTag: 'Normalization',
    articleMarkdown: buildTechnicalArticle(
      'Batch Normalization & Running Inference Statistics',
      'Batch Normalization directly standardizes pre-activations to zero mean and unit variance across each mini-batch, followed by learned scale (γ) and shift (β).',
      'Normalization',
      `bnmean = hpreact.mean(0, keepdim=True)
bnstd = hpreact.std(0, keepdim=True)
hpreact = bngain * (hpreact - bnmean) / (bnstd + 1e-5) + bnbias`,
      [
        'Preceding a BatchNorm layer with a linear bias is redundant because mean subtraction cancels it out.',
        'Batch statistics introduce slight regularization noise that discourages overfitting.',
        'During inference, use exponentially smoothed running_mean and running_std so single inputs can be evaluated.',
      ]
    ),
    quizQuestions: createLessonQuestions('nn_12', 1100, 2140, {
      q1Prompt: 'Why is a bias vector b unnecessary in a Linear layer that is immediately followed by Batch Normalization?',
      q1Options: [
        'Because BatchNorm subtracts the batch mean of the pre-activations, which completely cancels out any constant additive bias b',
        'Because BatchNorm only accepts integer inputs',
        'Because PyTorch automatically deletes bias parameters on GPU',
        'Because the activation function zeroes out negative biases',
      ],
      q1Correct: 0,
      q1Explanation: 'Adding a constant b to every example shifts the batch mean by +b, which is immediately subtracted out in (x - mean), while bnbias handles shifting.',
      q2Prompt: 'How does Batch Normalization normalize activations at inference time when predicting on a single example (batch size = 1)?',
      q2Options: [
        'It uses the exponentially weighted running_mean and running_var estimated during training',
        'It computes the standard deviation of the single example as 0 and divides by 0',
        'It disables the neural network’s hidden layers',
        'It duplicates the input example 64 times with random noise',
      ],
      q2Correct: 0,
      q2Explanation: 'Fixed running buffers tracked via momentum during training allow deterministic single-example evaluation at test time.',
    }),
  },
  {
    id: 'nn_13',
    sequenceNumber: 13,
    title: 'Manual Backprop Ninja: Deriving Analytical Gradients Through Cross-Entropy',
    summaryDescription: 'Replace loss.backward() with handwritten tensor calculus for linear layers, batch norm, and log-softmax.',
    durationSeconds: 1180,
    youtubeVideoId: 'q8SA3rM6ckI',
    startSeconds: 0,
    endSeconds: 1180,
    conceptTag: 'Tensor Calculus',
    articleMarkdown: buildTechnicalArticle(
      'Analytical Gradient of Cross-Entropy Loss',
      'Rather than backpropagating through exp, sum, division, and log separately, the combined derivative of Cross-Entropy with respect to logits simplifies remarkably.',
      'Tensor Calculus',
      `dlogits = F.softmax(logits, dim=1)
dlogits[range(n), Yb] -= 1
dlogits /= n`,
      [
        'For a single example, ∂L/∂logits is simply the predicted probability vector minus 1 at the true label index.',
        'Always verify tensor shapes first: the gradient dW must match the exact shape of W.',
        'Dividing by batch size n scales gradients properly for mean reduction.',
      ]
    ),
    quizQuestions: createLessonQuestions('nn_13', 0, 1180, {
      q1Prompt: 'For a single training example with predicted softmax probabilities p and ground-truth class y, what is the gradient ∂L/∂logits_i?',
      q1Options: [
        'p_i - 1 if i == y, and p_i otherwise',
        '1 / p_i for all classes i',
        'log(p_i) + 1',
        '0 for all classes except y',
      ],
      q1Correct: 0,
      q1Explanation: 'Differentiating -log(softmax(logits)_y) yields p - one_hot(y): positive gradients pull down wrong class logits and negative gradient boosts the true class logit.',
      q2Prompt: 'If forward linear layer computes out = h @ W + b where h is (N, D) and W is (D, M), what is the matrix formula for dW given upstream gradient dout of shape (N, M)?',
      q2Options: ['h.T @ dout', 'dout @ h.T', 'h @ dout', 'W.T @ dout'],
      q2Correct: 0,
      q2Explanation: 'Since dW must have shape (D, M) matching W, multiplying h.T of shape (D, N) by dout of shape (N, M) yields the exact (D, M) outer product sum.',
    }),
  },
  {
    id: 'nn_14',
    sequenceNumber: 14,
    title: 'Hierarchical Dilated Convolutions & WaveNet Tree Fusion',
    summaryDescription: 'Fuse context progressively across binary pairs of tokens instead of squashing all inputs in a single flat layer.',
    durationSeconds: 920,
    youtubeVideoId: 't3YJ5hKiMQ0',
    startSeconds: 0,
    endSeconds: 920,
    conceptTag: 'WaveNet',
    articleMarkdown: buildTechnicalArticle(
      'Hierarchical Token Fusion in WaveNet Architectures',
      'Flattening an 8-character context window into a single vector loses hierarchical structure. Grouping consecutive pairs into bigrams, then four-grams, mirrors dilated causal convolutions.',
      'WaveNet',
      `# Reshape (B, 8, C) into (B, 4, 2*C) to fuse adjacent pairs
x = x.view(B, -1, 2 * C) @ W + b`,
      [
        '3D tensor matrix multiplication in PyTorch applies the linear projection across the last dimension only.',
        'Ensure BatchNorm averages over both (0, 1) dimensions when normalizing 3D sequence tensors.',
        'Hierarchical tree fusion lowers validation loss while keeping parameter counts constant.',
      ]
    ),
    quizQuestions: createLessonQuestions('nn_14', 0, 920, {
      q1Prompt: 'When multiplying a 3D tensor x of shape (B, 4, 20) by a 2D weight matrix W of shape (20, 68) in PyTorch (x @ W), what is the output shape?',
      q1Options: ['(B, 4, 68)', '(B, 20, 68)', '(4, 68)', '(B, 272)'],
      q1Correct: 0,
      q1Explanation: 'PyTorch’s @ operator treats leading dimensions (B, 4) as batch dimensions and applies the (20, 68) matrix multiplication across the final dimension.',
      q2Prompt: 'When applying BatchNorm1d to a 3D sequence activation tensor of shape (B, T, C), which dimensions should the mean and variance be computed over?',
      q2Options: [
        'Both the batch and time dimensions (0, 1) so each of the C channels has a single shared mean and variance',
        'Only dimension 0, maintaining separate statistics for every time step T',
        'Only the channel dimension 2',
        'No dimensions; BatchNorm cannot run on 3D tensors',
      ],
      q2Correct: 0,
      q2Explanation: 'Reduction over (0, 1) pools all B × T token positions together to estimate stable per-channel statistics of shape (1, 1, C).',
    }),
  },
  {
    id: 'nn_15',
    sequenceNumber: 15,
    title: 'Scaled Dot-Product Self-Attention & Causal Triangular Masking',
    summaryDescription: 'Implement query, key, and value projections so tokens aggregate historical context dynamically.',
    durationSeconds: 1160,
    youtubeVideoId: 'kCc8FmEb1nY',
    startSeconds: 0,
    endSeconds: 1160,
    conceptTag: 'Self-Attention',
    articleMarkdown: buildTechnicalArticle(
      'Scaled Dot-Product Self-Attention Mechanism',
      'Self-attention allows every token position t to emit a Query vector that scores affinity against Key vectors of all preceding positions ≤ t.',
      'Self-Attention',
      `wei = (q @ k.transpose(-2, -1)) * (head_size ** -0.5)
wei = wei.masked_fill(tril[:T, :T] == 0, float('-inf'))
wei = F.softmax(wei, dim=-1)
out = wei @ v`,
      [
        'Dividing by √head_size prevents dot products from growing large and pushing softmax into one-hot saturation.',
        'Masking upper-triangular future positions with -inf ensures autoregressive causality.',
        'Attention is a data-dependent communication step; MLPs provide per-token computation.',
      ]
    ),
    quizQuestions: createLessonQuestions('nn_15', 0, 1160, {
      q1Prompt: 'Why do we fill the upper-triangular entries of the attention affinity matrix with -inf before applying softmax in a decoder language model?',
      q1Options: [
        'Because exp(-inf) = 0, preventing any token at time t from attending to or leaking information from future tokens > t',
        'To speed up matrix multiplication on the GPU',
        'To normalize the query and key vectors to unit length',
        'Because softmax only accepts negative numbers',
      ],
      q1Correct: 0,
      q1Explanation: 'Setting future positions to -inf ensures softmax assigns them exactly 0.0 weight while normalizing weights over past positions 0..t to sum to 1.',
      q2Prompt: 'Why does Scaled Dot-Product Attention divide QK^T by √d_k (the square root of head_size)?',
      q2Options: [
        'To keep the variance of dot products near 1.0 so softmax does not saturate into sharp one-hot peaks with vanishing gradients',
        'To convert floating-point values into integers',
        'To reduce the sequence length T by half',
        'Because Q and K have different embedding dimensions',
      ],
      q2Correct: 0,
      q2Explanation: 'If Q and K have unit variance, their dot product has variance d_k; dividing by √d_k restores unit variance before softmax.',
    }),
  },
  {
    id: 'nn_16',
    sequenceNumber: 16,
    title: 'Multi-Head Attention, Residual Pathways, LayerNorm & Dropout',
    summaryDescription: 'Assemble a full decoder-only Transformer block and train a character-level GPT from scratch.',
    durationSeconds: 1200,
    youtubeVideoId: 'kCc8FmEb1nY',
    startSeconds: 1160,
    endSeconds: 2360,
    conceptTag: 'Transformers',
    articleMarkdown: buildTechnicalArticle(
      'Assembling the Decoder-Only Transformer Block',
      'Running multiple attention heads in parallel lets the Transformer attend to distinct syntactic and phonetic patterns simultaneously, while residual highways preserve gradient flow.',
      'Transformers',
      `class Block(nn.Module):
    def forward(self, x):
        x = x + self.sa(self.ln1(x))
        x = x + self.ffwd(self.ln2(x))
        return x`,
      [
        'Pre-LayerNorm (normalizing before attention and feed-forward layers) stabilizes deep Transformer training.',
        'Residual connections (x = x + f(x)) create an unimpeded gradient superhighway from loss to embeddings.',
        'Positional embeddings inject sequence order information into otherwise permutation-invariant attention.',
      ]
    ),
    quizQuestions: createLessonQuestions('nn_16', 1160, 2360, {
      q1Prompt: 'How does Layer Normalization differ from Batch Normalization in a Transformer?',
      q1Options: [
        'LayerNorm normalizes across the feature/channel dimension for each individual token independently, requiring no batch-wide statistics or running buffers',
        'LayerNorm only runs during evaluation and is disabled during training',
        'LayerNorm normalizes across the sequence length dimension T',
        'LayerNorm does not have learnable γ and β parameters',
      ],
      q1Correct: 0,
      q1Explanation: 'Normalizing across the feature vector of each token independently makes LayerNorm invariant to batch size and sequence position.',
      q2Prompt: 'Why are residual skip connections (x = x + sublayer(x)) essential when stacking many Transformer blocks?',
      q2Options: [
        'Because addition distributes gradients equally During backprop, creating an unimpeded gradient highway directly from the loss to early layers',
        'Because they reduce the number of parameters in the attention heads by 50%',
        'Because they replace the need for positional embeddings',
        'Because they force attention matrices to be symmetric',
      ],
      q2Correct: 0,
      q2Explanation: 'Skip connections allow gradients to flow straight through identity additions from the final loss all the way back to the token embeddings.',
    }),
  },
];

const linearAlgebraLessons: Lesson[] = [
  {
    id: 'la_01',
    sequenceNumber: 1,
    title: 'Vectors: What Even Are They? Physics vs. CS vs. Math Perspectives',
    summaryDescription: 'Unify arrows in space and ordered numerical lists through coordinate axes in the Cartesian plane.',
    durationSeconds: 600,
    youtubeVideoId: 'fNk_zzaMoSs',
    startSeconds: 0,
    endSeconds: 600,
    conceptTag: 'Vectors',
    articleMarkdown: buildTechnicalArticle(
      'Geometric Arrows Meet Ordered Number Lists',
      'In linear algebra, a vector always starts at the origin [0, 0]. Its coordinates tell you how far to walk parallel to the x-axis and y-axis to reach its tip.',
      'Vectors',
      `import numpy as np

v = np.array([3, -2])
w = np.array([1, 4])
tip_to_tail = v + w  # array([4, 2])`,
      [
        'Vector addition corresponds geometrically to placing the tail of w at the tip of v.',
        'Multiplying a vector by a scalar stretches, shrinks, or reverses its direction along the same line.',
        'Translating back and forth between geometric arrows and numeric coordinates is the core superpower of linear algebra.',
      ]
    ),
    quizQuestions: createLessonQuestions('la_01', 0, 600, {
      q1Prompt: 'Geometrically, how is the vector sum v + w constructed when vectors are represented as arrows in the plane?',
      q1Options: [
        'Place the tail of w at the tip of v and draw an arrow from the origin to the tip of w',
        'Multiply the length of v by the length of w',
        'Draw an arrow from the tip of v to the tip of w',
        'Rotate v by 90 degrees toward w',
      ],
      q1Correct: 0,
      q1Explanation: 'Walking along v from the origin and then walking along w from v’s tip lands at the coordinate sum [v_x + w_x, v_y + w_y].',
      q2Prompt: 'What is the geometric effect of multiplying a 2D vector v by the scalar -2?',
      q2Options: [
        'It flips v to point in the exact opposite direction and stretches its length by a factor of 2',
        'It shifts v downward by 2 units along the y-axis',
        'It rotates v by 90 degrees counterclockwise',
        'It shrinks the length of v by half',
      ],
      q2Correct: 0,
      q2Explanation: 'Negative scalars reverse the arrow’s orientation through the origin while scaling its magnitude by |c|.',
    }),
  },
  {
    id: 'la_02',
    sequenceNumber: 2,
    title: 'Linear Combinations, Span, and Basis Vectors',
    summaryDescription: 'Visualize scalar multiplication and vector addition as re-scaling the basis vectors i-hat and j-hat.',
    durationSeconds: 680,
    youtubeVideoId: 'k7RM-ot2NWY',
    startSeconds: 0,
    endSeconds: 680,
    conceptTag: 'Span & Basis',
    articleMarkdown: buildTechnicalArticle(
      'Basis Vectors & The Span of a Vector Set',
      'Any coordinate pair [x, y] can be interpreted as scaling the standard unit vectors î = [1, 0] and ĵ = [0, 1] by x and y respectively, then adding them.',
      'Span & Basis',
      `i_hat = np.array([1, 0])
j_hat = np.array([0, 1])
linear_comb = 3 * i_hat + (-2) * j_hat`,
      [
        'A linear combination of two vectors v and w is any expression a·v + b·w as scalars a and b vary.',
        'The span of two non-collinear 2D vectors is the entire two-dimensional plane.',
        'Choosing different basis vectors defines an entirely new coordinate grid over the same space.',
      ]
    ),
    quizQuestions: createLessonQuestions('la_02', 0, 680, {
      q1Prompt: 'What is the span of two non-zero 2D vectors v and w that point along the exact same line through the origin?',
      q1Options: [
        'A single 1D line passing through the origin',
        'The entire 2D plane',
        'Only the origin [0, 0]',
        'A circle of radius ||v|| + ||w||',
      ],
      q1Correct: 0,
      q1Explanation: 'When v and w are collinear, any linear combination a·v + b·w stays trapped on that same line.',
      q2Prompt: 'How does linear algebra interpret the coordinates [3, -2] in terms of the standard basis vectors î and ĵ?',
      q2Options: [
        'The linear combination 3î + (-2)ĵ',
        'The dot product of 3î and -2ĵ',
        'A line segment connecting (3, 0) to (0, -2)',
        'A matrix with determinant -6',
      ],
      q2Correct: 0,
      q2Explanation: 'Coordinates are scalars that scale the chosen basis vectors before adding them together.',
    }),
  },
  {
    id: 'la_03',
    sequenceNumber: 3,
    title: 'Linear Dependence vs. Independence in 2D and 3D Space',
    summaryDescription: 'Determine when a vector adds a new dimension to the span versus sitting redundantly on an existing sheet.',
    durationSeconds: 540,
    youtubeVideoId: 'k7RM-ot2NWY',
    startSeconds: 680,
    endSeconds: 1220,
    conceptTag: 'Independence',
    articleMarkdown: buildTechnicalArticle(
      'Linear Independence & Dimensional Redundancy',
      'A set of vectors is linearly dependent if at least one vector in the set already lies within the span of the others and therefore adds no new reachable directions.',
      'Independence',
      `# Testing independence via matrix rank
M = np.column_stack(([1, 2], [2, 4]))
is_independent = np.linalg.matrix_rank(M) == M.shape[1]  # False`,
      [
        'Two collinear vectors in 2D collapse their span down to a 1D line through the origin.',
        'Three linearly independent vectors in 3D span all of three-dimensional space.',
        'A basis of a space is a minimal spanning set of linearly independent vectors.',
      ]
    ),
    quizQuestions: createLessonQuestions('la_03', 680, 1220, {
      q1Prompt: 'When are three vectors u, v, and w in 3D space considered linearly dependent?',
      q1Options: [
        'When at least one of the vectors lies in the plane (or line) spanned by the other two, so removing it does not shrink the span',
        'When all three vectors have unit length 1',
        'When their coordinates are all positive integers',
        'When u, v, and w are mutually perpendicular',
      ],
      q1Correct: 0,
      q1Explanation: 'Linear dependence means one vector can be written as a linear combination of the others, making it redundant for spanning the space.',
      q2Prompt: 'What is the rigorous definition of a "basis" of a vector space?',
      q2Options: [
        'A set of linearly independent vectors that spans the entire space',
        'Any set of vectors whose coordinates are 0 and 1',
        'A set of vectors that all have the same length',
        'Any pair of vectors with a positive dot product',
      ],
      q2Correct: 0,
      q2Explanation: 'A basis has enough vectors to span the space and no redundant dependent vectors.',
    }),
  },
  {
    id: 'la_04',
    sequenceNumber: 4,
    title: 'Linear Transformations & Why Grid Lines Must Remain Parallel',
    summaryDescription: 'Interpret matrices not as static grids of numbers, but as dynamic functions that warp space while fixing the origin.',
    durationSeconds: 740,
    youtubeVideoId: 'kYB8IZa5AuE',
    startSeconds: 0,
    endSeconds: 740,
    conceptTag: 'Transformations',
    articleMarkdown: buildTechnicalArticle(
      'Visualizing Linear Transformations in Motion',
      'A transformation is a function that takes an input vector and moves it to an output vector. It is linear if it preserves lines and keeps the origin fixed in place.',
      'Transformations',
      `def is_linear(L, u, v, c):
    return np.allclose(L(u + v), L(u) + L(v)) and np.allclose(L(c * u), c * L(u))`,
      [
        'Grid lines must remain straight, parallel, and evenly spaced after a linear transformation.',
        'Curving grid lines or shifting the origin [0, 0] immediately violates linearity.',
        'Because grid lines stay evenly spaced, a linear map is completely determined by where î and ĵ land.',
      ]
    ),
    quizQuestions: createLessonQuestions('la_04', 0, 740, {
      q1Prompt: 'Which two visual properties must hold for a geometric transformation of 2D space to be linear?',
      q1Options: [
        'All lines must remain straight (uncurved) and the origin [0, 0] must remain fixed in place',
        'All lengths and angles between vectors must remain unchanged',
        'No vector is allowed to cross the y-axis',
        'Every vector must double in length',
      ],
      q1Correct: 0,
      q1Explanation: 'Preserving straight, parallel, evenly spaced grid lines while keeping the origin fixed is the exact geometric equivalent of L(av + bw) = aL(v) + bL(w).',
      q2Prompt: 'Why is knowing where î and ĵ land sufficient to predict where v = 3î + 2ĵ lands under any linear transformation L?',
      q2Options: [
        'Because linearity guarantees L(3î + 2ĵ) = 3L(î) + 2L(ĵ); the same linear combination applies to the transformed basis vectors',
        'Because 3î + 2ĵ never moves under linear transformations',
        'Because L(î) and L(ĵ) are always perpendicular',
        'Because all linear transformations are rigid rotations',
      ],
      q2Correct: 0,
      q2Explanation: 'Since grid lines remain parallel and evenly spaced, a vector’s coordinates relative to the transformed basis vectors never change.',
    }),
  },
  {
    id: 'la_05',
    sequenceNumber: 5,
    title: 'Recording Where Basis Vectors Land: 2x2 Matrix-Vector Multiplication',
    summaryDescription: 'Predict where any vector [x, y] lands after a linear transformation solely from the transformed coordinates of i-hat and j-hat.',
    durationSeconds: 660,
    youtubeVideoId: 'kYB8IZa5AuE',
    startSeconds: 740,
    endSeconds: 1400,
    conceptTag: 'Matrices',
    articleMarkdown: buildTechnicalArticle(
      'Reading a 2×2 Matrix by Its Columns',
      'A 2×2 matrix is simply a compact package storing two columns: the first column is where î lands, and the second column is where ĵ lands.',
      'Matrices',
      `# 90-degree counterclockwise rotation: i_hat -> [0, 1], j_hat -> [-1, 0]
R = np.array([[0, -1],
              [1,  0]])
v_rotated = R @ np.array([3, 2])  # [-2, 3]`,
      [
        'Multiplying matrix M by vector [x, y] computes x · (Column 1) + y · (Column 2).',
        'Never memorize row-by-column dot products without visualizing the basis columns first.',
        'Shear, rotation, and reflection matrices can be written down by inspection of î and ĵ.',
      ]
    ),
    quizQuestions: createLessonQuestions('la_05', 740, 1400, {
      q1Prompt: 'If a 2D linear transformation rotates space by 90° counterclockwise, what 2×2 matrix represents it?',
      q1Options: [
        '[[0, -1], [1, 0]] (column 1 is [0, 1], column 2 is [-1, 0])',
        '[[1, 0], [0, 1]]',
        '[[0, 1], [1, 0]]',
        '[[-1, 0], [0, -1]]',
      ],
      q1Correct: 0,
      q1Explanation: 'Rotating 90° counterclockwise sends î = [1, 0] to [0, 1] (first column) and ĵ = [0, 1] to [-1, 0] (second column).',
      q2Prompt: 'If a 2×2 matrix has columns [3, 1] and [1, 2], where does it send the input vector [2, -1]?',
      q2Options: ['[5, 0]', '[6, -2]', '[4, 3]', '[2, 1]'],
      q2Correct: 0,
      q2Explanation: '2 × [3, 1] + (-1) × [1, 2] = [6 - 1, 2 - 2] = [5, 0].',
    }),
  },
  {
    id: 'la_06',
    sequenceNumber: 6,
    title: 'Matrix Multiplication as Geometric Composition of Transformations',
    summaryDescription: 'See why applying a rotation followed by a shear corresponds to reading matrix products from right to left.',
    durationSeconds: 780,
    youtubeVideoId: 'XkY2DOUCWMU',
    startSeconds: 0,
    endSeconds: 780,
    conceptTag: 'Composition',
    articleMarkdown: buildTechnicalArticle(
      'Function Composition & Matrix Multiplication Order',
      'Applying one linear transformation and then another produces a new overall linear transformation whose matrix is the product M₂ M₁.',
      'Composition',
      `shear = np.array([[1, 1], [0, 1]])
rotate = np.array([[0, -1], [1, 0]])
# Rotate first, then shear:
combined = shear @ rotate`,
      [
        'Matrix products read right-to-left, just like nested function notation f(g(x)).',
        'Order matters: rotating then shearing yields a different result than shearing then rotating (AB ≠ BA).',
        'Associativity (AB)C = A(BC) is obvious geometrically because both apply C, then B, then A.',
      ]
    ),
    quizQuestions: createLessonQuestions('la_06', 0, 780, {
      q1Prompt: 'In the matrix product M₂ M₁ v, which transformation is applied to vector v first?',
      q1Options: [
        'M₁ is applied first, followed by M₂ (reading right-to-left like function composition M₂(M₁(v)))',
        'M₂ is applied first, followed by M₁',
        'Both matrices are averaged together before multiplying v',
        'Neither; matrix multiplication is always commutative',
      ],
      q1Correct: 0,
      q1Explanation: 'Because vectors sit on the right of matrices, M₁ acts directly on v first, and M₂ then transforms the resulting vector M₁v.',
      q2Prompt: 'How do you find the first column of the product matrix M₂ M₁ geometrically?',
      q2Options: [
        'Multiply M₂ by the first column of M₁ to see where î lands after both transformations',
        'Add the first row of M₂ to the first row of M₁',
        'Take the determinant of M₁',
        'Transpose M₂',
      ],
      q2Correct: 0,
      q2Explanation: 'The first column of M₁ is where î lands after the first transformation; applying M₂ to that vector tells us where î ends up overall.',
    }),
  },
  {
    id: 'la_07',
    sequenceNumber: 7,
    title: 'Three-Dimensional Linear Transformations & Robot Arm Kinematics',
    summaryDescription: 'Extend basis tracking to i-hat, j-hat, and k-hat using 3x3 matrices in three-dimensional space.',
    durationSeconds: 590,
    youtubeVideoId: 'rHLEWRxRGiM',
    startSeconds: 0,
    endSeconds: 590,
    conceptTag: '3D Geometry',
    articleMarkdown: buildTechnicalArticle(
      'Extending Basis Tracking to 3D Space',
      'In three dimensions we add a third standard basis vector k̂ = [0, 0, 1] pointing along the z-axis. A 3×3 matrix records where î, ĵ, and k̂ land in its three columns.',
      '3D Geometry',
      `# 90-degree rotation around the y-axis
R_y = np.array([[ 0, 0, 1],
                [ 0, 1, 0],
                [-1, 0, 0]])`,
      [
        'Each column of a 3×3 matrix gives the new 3D coordinates of one basis vector.',
        '3D graphics engines chain 3×3 rotation and scaling matrices to orient cameras and meshes.',
        'Multiplying two 3×3 matrices composes 3D spatial rotations.',
      ]
    ),
    quizQuestions: createLessonQuestions('la_07', 0, 590, {
      q1Prompt: 'What does the third column of a 3×3 transformation matrix represent?',
      q1Options: [
        'The 3D coordinates where the z-axis basis vector k̂ = [0, 0, 1] lands after the transformation',
        'The origin of 3D space',
        'The scaling factor of volume',
        'The angle of rotation in degrees',
      ],
      q1Correct: 0,
      q1Explanation: 'In a 3×3 matrix, columns 1, 2, and 3 record the transformed landing coordinates of î, ĵ, and k̂ respectively.',
      q2Prompt: 'If a 3D rotation occurs strictly around the y-axis, what must the second column of its 3×3 matrix be?',
      q2Options: ['[0, 1, 0]', '[1, 0, 0]', '[0, 0, 1]', '[0, 0, 0]'],
      q2Correct: 0,
      q2Explanation: 'Rotating around the y-axis leaves the y-axis basis vector ĵ = [0, 1, 0] completely stationary.',
    }),
  },
  {
    id: 'la_08',
    sequenceNumber: 8,
    title: 'The Determinant: Scaling Area, Volume, and Orientation Flipping',
    summaryDescription: 'Measure the exact factor by which a linear transformation stretches or squishes unit areas and inverts space.',
    durationSeconds: 720,
    youtubeVideoId: 'Ip3X9LOh2dk',
    startSeconds: 0,
    endSeconds: 720,
    conceptTag: 'Determinants',
    articleMarkdown: buildTechnicalArticle(
      'Geometric Meaning of the Determinant',
      'The determinant of a transformation measures the factor by which the area of a 1×1 unit square (or volume of a 1×1×1 unit cube) scales after the transformation.',
      'Determinants',
      `M = np.array([[3, 2],
              [0, 2]])
area_scale = np.linalg.det(M)  # 6.0`,
      [
        'A determinant of 0 means space gets squished into a lower-dimensional line, plane, or point.',
        'A negative determinant means the orientation of space has been flipped (like turning a sheet over).',
        'det(AB) = det(A) · det(B) because scaling areas by A then by B multiplies the scaling factors.',
      ]
    ),
    quizQuestions: createLessonQuestions('la_08', 0, 720, {
      q1Prompt: 'What does it mean geometrically if a 2×2 matrix A has det(A) = -4?',
      q1Options: [
        'The transformation flips the orientation of 2D space (e.g., ĵ is now clockwise of î) and scales all areas by a factor of 4',
        'All vectors are shortened by 4 units',
        'The entire plane is squished onto a 1D line',
        'Space is rotated by 4 radians without changing area',
      ],
      q1Correct: 0,
      q1Explanation: 'The sign of the determinant indicates whether orientation is inverted, and its absolute value |det(A)| = 4 gives the area scaling factor.',
      q2Prompt: 'Under what geometric condition does the determinant of a 3×3 matrix equal 0?',
      q2Options: [
        'When 3D space is squished flat into a 2D plane, a 1D line, or a single point (volume becomes 0)',
        'When the matrix is a pure 3D rotation',
        'When the columns are mutually perpendicular unit vectors',
        'When the matrix is the identity matrix',
      ],
      q2Correct: 0,
      q2Explanation: 'A zero determinant means the three columns are linearly dependent and flatten the unit cube into zero 3D volume.',
    }),
  },
  {
    id: 'la_09',
    sequenceNumber: 9,
    title: 'Inverse Matrices, Column Space & Rank',
    summaryDescription: 'Solve Ax = v geometrically by playing a transformation backward when the determinant is non-zero.',
    durationSeconds: 810,
    youtubeVideoId: 'uQhTuRlWMxw',
    startSeconds: 0,
    endSeconds: 810,
    conceptTag: 'Column Space',
    articleMarkdown: buildTechnicalArticle(
      'Column Space, Rank & Playing Transformations Backward',
      'A linear system Ax = v asks for an input vector x that lands on v after applying transformation A. When det(A) ≠ 0, the unique answer is A⁻¹v.',
      'Column Space',
      `A = np.array([[2, 1], [1, 3]])
v = np.array([5, 5])
x = np.linalg.solve(A, v)  # [2., 1.]`,
      [
        'The Column Space of A is the span of its columns—the set of all possible outputs Ax.',
        'Rank is the number of dimensions in the column space after the transformation.',
        'A full-rank square matrix loses no dimensions and always possesses an inverse A⁻¹.',
      ]
    ),
    quizQuestions: createLessonQuestions('la_09', 0, 810, {
      q1Prompt: 'What is the "Column Space" of a matrix A?',
      q1Options: [
        'The span of the columns of A, which equals the set of all possible output vectors Ax',
        'The number of rows in matrix A',
        'The set of vectors that get mapped to [0, 0]',
        'The diagonal entries of A',
      ],
      q1Correct: 0,
      q1Explanation: 'Since Ax is a linear combination of the columns of A, the set of all reachable outputs is the span of A’s columns.',
      q2Prompt: 'If a 3×3 matrix maps 3D space onto a 2D plane passing through the origin, what is the rank of the matrix?',
      q2Options: ['Rank 2', 'Rank 3', 'Rank 1', 'Rank 0'],
      q2Correct: 0,
      q2Explanation: 'Rank is the geometric dimension of the transformation’s output (column space); a plane has dimension 2.',
    }),
  },
  {
    id: 'la_10',
    sequenceNumber: 10,
    title: 'Null Space (Kernel) & Singular Systems of Equations',
    summaryDescription: 'Identify the set of all vectors that get squished directly onto the origin when rank drops below full dimension.',
    durationSeconds: 690,
    youtubeVideoId: 'uQhTuRlWMxw',
    startSeconds: 810,
    endSeconds: 1500,
    conceptTag: 'Null Space',
    articleMarkdown: buildTechnicalArticle(
      'The Null Space (Kernel) of a Singular Matrix',
      'When a transformation squishes 2D space onto a 1D line, an entire line of vectors gets compressed straight onto the origin [0, 0]. That set is the null space.',
      'Null Space',
      `# All multiples of [-1, 1] land on [0, 0]
A = np.array([[2, 2],
              [1, 1]])
zero_out = A @ np.array([-3, 3])  # [0, 0]`,
      [
        'The null space is the set of all solutions to the homogeneous equation Ax = 0.',
        'For full-rank transformations, the only vector that lands on 0 is [0, 0] itself.',
        'Rank + Nullity always equals the number of input columns.',
      ]
    ),
    quizQuestions: createLessonQuestions('la_10', 810, 1500, {
      q1Prompt: 'Geometrically, what is the Null Space (or Kernel) of a matrix A?',
      q1Options: [
        'The set of all input vectors v that get squished directly onto the zero vector (Av = 0)',
        'The set of all outputs reachable by A',
        'The inverse of matrix A',
        'The set of eigenvectors with eigenvalue 1',
      ],
      q1Correct: 0,
      q1Explanation: 'The null space consists of every vector v satisfying Av = 0.',
      q2Prompt: 'If a 3×3 matrix has Rank 2 (squishing 3D space onto a 2D plane), what does its Null Space look like geometrically?',
      q2Options: [
        'A 1D line of vectors passing through the origin',
        'Only the single point [0, 0, 0]',
        'A 2D plane',
        'All of 3D space',
      ],
      q2Correct: 0,
      q2Explanation: 'By the Rank-Nullity theorem (3 - 2 = 1), losing 1 dimension means an entire 1D line of directions collapses onto the origin.',
    }),
  },
  {
    id: 'la_11',
    sequenceNumber: 11,
    title: 'Non-Square Matrices as Transformations Between Dimensions',
    summaryDescription: 'Map 2D planes into 3D space with 3x2 matrices and project 3D space onto a 2D canvas with 2x3 matrices.',
    durationSeconds: 540,
    youtubeVideoId: 'v8VSDg_WQlA',
    startSeconds: 0,
    endSeconds: 540,
    conceptTag: 'Projections',
    articleMarkdown: buildTechnicalArticle(
      'Mapping Across Dimensions with Non-Square Matrices',
      'An m × n matrix transforms n-dimensional input vectors into m-dimensional output vectors because it has n columns (one per input basis vector) of length m.',
      'Projections',
      `# 3x2 matrix maps 2D input into a plane inside 3D space
M_3x2 = np.array([[1, 0],
                  [0, 1],
                  [1, 1]])
out_3d = M_3x2 @ np.array([2, 3])  # [2, 3, 5]`,
      [
        'A 3×2 matrix has 2 columns in 3D space, mapping the 2D plane onto a tilted 2D slice through 3D.',
        'A 2×3 matrix has 3 columns in 2D space, projecting 3D vectors down onto a 2D screen.',
        'A 1×2 matrix maps 2D vectors down onto the 1D number line.',
      ]
    ),
    quizQuestions: createLessonQuestions('la_11', 0, 540, {
      q1Prompt: 'What dimensions does a 2×3 matrix (2 rows, 3 columns) map between?',
      q1Options: [
        'It takes 3D input vectors and transforms them into 2D output vectors',
        'It takes 2D input vectors and transforms them into 3D output vectors',
        'It maps 2D vectors to 2D vectors',
        'It maps 3D vectors to 1D scalars',
      ],
      q1Correct: 0,
      q1Explanation: '3 columns correspond to the 3 input basis vectors (î, ĵ, k̂), and each column has 2 coordinates in the 2D output space.',
      q2Prompt: 'What is the geometric shape of the column space of a full-rank 3×2 matrix?',
      q2Options: [
        'A 2D plane slicing through the origin of 3D space',
        'All of 3D space',
        'A 1D line in 2D space',
        'A 3D sphere',
      ],
      q2Correct: 0,
      q2Explanation: 'The two independent 3D columns span a 2-dimensional flat plane embedded inside 3D space.',
    }),
  },
  {
    id: 'la_12',
    sequenceNumber: 12,
    title: 'Dot Products & Duality: Connecting Projection to Linear Functionals',
    summaryDescription: 'Discover why taking a dot product with a unit vector is identical to applying a 1x2 projection matrix.',
    durationSeconds: 880,
    youtubeVideoId: 'LyGKycYT2v0',
    startSeconds: 0,
    endSeconds: 880,
    conceptTag: 'Duality',
    articleMarkdown: buildTechnicalArticle(
      'Geometric Projection & Vector-Row Duality',
      'Any linear transformation from 2D space to the 1D number line is represented by a 1×2 row matrix. By symmetry, projecting onto unit vector u places u’s coordinates into that row.',
      'Duality',
      `u = np.array([4, 3])
v = np.array([2, -1])
dot_val = np.dot(u, v)  # 4*2 + 3*(-1) = 5`,
      [
        'The dot product u · v > 0 when vectors point in similar directions, 0 when perpendicular, and < 0 when opposed.',
        'Order does not matter (u · v = v · u) because projecting u onto v scales symmetrically with projecting v onto u.',
        'A 2D column vector has a dual interpretation as the 1×2 linear functional produced by tipping it on its side.',
      ]
    ),
    quizQuestions: createLessonQuestions('la_12', 0, 880, {
      q1Prompt: 'What does it mean geometrically when the dot product of two non-zero vectors u · v equals 0?',
      q1Options: [
        'The vectors u and v are perpendicular (orthogonal), so projecting one onto the other lands on the origin',
        'The vectors point in the exact same direction',
        'The vectors point in opposite directions',
        'Both vectors have length 1',
      ],
      q1Correct: 0,
      q1Explanation: 'When u and v are 90° apart, the orthogonal projection of v onto the line of u has length 0.',
      q2Prompt: 'In the context of linear algebra duality, what does a 1×2 row matrix [u_x, u_y] represent?',
      q2Options: [
        'A linear transformation from 2D vectors to 1D numbers given by taking the dot product with column vector u',
        'A transformation from 1D numbers into 2D space',
        'A 90-degree rotation in 2D space',
        'An uninvertible 2×2 matrix',
      ],
      q2Correct: 0,
      q2Explanation: 'Every linear functional mapping space onto the number line is the dual partner of a unique vector via the dot product.',
    }),
  },
  {
    id: 'la_13',
    sequenceNumber: 13,
    title: 'Cross Products Through the Lens of Linear Transformations',
    summaryDescription: 'Compute signed parallelogram area and perpendicular normal vectors using dual 3D determinant forms.',
    durationSeconds: 820,
    youtubeVideoId: 'BaM7OCEm3G0',
    startSeconds: 0,
    endSeconds: 820,
    conceptTag: 'Cross Products',
    articleMarkdown: buildTechnicalArticle(
      'The 3D Cross Product & Parallelogram Area',
      'Given two 3D vectors v and w, their cross product v × w is a vector perpendicular to the plane they span whose length equals the area of their parallelogram.',
      'Cross Products',
      `v = np.array([1, 0, 0])
w = np.array([0, 1, 0])
normal = np.cross(v, w)  # [0, 0, 1]`,
      [
        'The direction of v × w follows the right-hand rule.',
        'The length ||v × w|| = ||v|| ||w|| sin(θ) is maximized when v and w are orthogonal.',
        'Defining a linear volume function det([x, v, w]) reveals v × w as its dual vector.',
      ]
    ),
    quizQuestions: createLessonQuestions('la_13', 0, 820, {
      q1Prompt: 'What two geometric properties define the 3D cross product vector p = v × w?',
      q1Options: [
        'p is perpendicular to the plane spanned by v and w (via the right-hand rule), and ||p|| equals the area of the parallelogram spanned by v and w',
        'p lies halfway between v and w, and ||p|| equals ||v|| + ||w||',
        'p is parallel to v, and ||p|| equals the dot product v · w',
        'p is always a unit vector of length 1 along the x-axis',
      ],
      q1Correct: 0,
      q1Explanation: 'The cross product is normal to both v and w, with magnitude equal to the base-times-height area of their parallelogram.',
      q2Prompt: 'How does swapping the order of operands affect the cross product (w × v vs. v × w)?',
      q2Options: [
        'It reverses the direction of the resulting vector: w × v = -(v × w)',
        'It leaves the resulting vector unchanged',
        'It zeroes out the cross product',
        'It squares the length of the vector',
      ],
      q2Correct: 0,
      q2Explanation: 'Swapping two columns of a determinant flips the sign of orientation, reversing the right-hand normal vector.',
    }),
  },
  {
    id: 'la_14',
    sequenceNumber: 14,
    title: 'Change of Basis: Translating Between Coordinate Languages',
    summaryDescription: 'Conjugate transformations via A^-1 M A to express geometric operations in an alternate coordinate grid.',
    durationSeconds: 910,
    youtubeVideoId: 'P2LTAUO1TdA',
    startSeconds: 0,
    endSeconds: 910,
    conceptTag: 'Change of Basis',
    articleMarkdown: buildTechnicalArticle(
      'Coordinate Translation & Matrix Conjugation (A⁻¹ M A)',
      'Different observers may use different basis vectors to describe the exact same geometric point in space. Change-of-basis matrices translate coordinates between these languages.',
      'Change of Basis',
      `A = np.array([[2, -1], [1, 1]])  # Alternate basis columns
A_inv = np.linalg.inv(A)
M_alt = A_inv @ M_std @ A`,
      [
        'Multiplying by A translates coordinates from the alternate basis into standard coordinates.',
        'Multiplying by A⁻¹ translates standard coordinates back into the alternate basis.',
        'Sandwiching A⁻¹ M A expresses a standard transformation M inside the alternate coordinate system.',
      ]
    ),
    quizQuestions: createLessonQuestions('la_14', 0, 910, {
      q1Prompt: 'If the columns of matrix A are Jennifer’s alternate basis vectors written in standard coordinates, what does multiplying A by a vector v_jen do?',
      q1Options: [
        'It translates the vector from Jennifer’s coordinate language into standard coordinates',
        'It translates standard coordinates into Jennifer’s coordinate language',
        'It rotates the vector by 90 degrees',
        'It computes the eigenvalues of v_jen',
      ],
      q1Correct: 0,
      q1Explanation: 'Since the columns of A are Jennifer’s basis vectors in our grid, scaling them by Jennifer’s coordinates reconstructs the point in our standard grid.',
      q2Prompt: 'What does the conjugated matrix product A⁻¹ M A represent?',
      q2Options: [
        'The same geometric transformation M, but expressed entirely in the alternate basis coordinate system',
        'The inverse of transformation M',
        'A matrix whose determinant is always 0',
        'The sum of matrices A and M',
      ],
      q2Correct: 0,
      q2Explanation: 'Reading right-to-left: A translates from alternate to standard, M applies the transformation in standard coordinates, and A⁻¹ translates the result back.',
    }),
  },
  {
    id: 'la_15',
    sequenceNumber: 15,
    title: 'Eigenvectors and Eigenvalues: Axis of Rotation & Invariant Lines',
    summaryDescription: 'Solve det(A - lambda*I) = 0 to find vectors that stay on their own span and only stretch by factor lambda.',
    durationSeconds: 1040,
    youtubeVideoId: 'PFDu9oVAE-g',
    startSeconds: 0,
    endSeconds: 1040,
    conceptTag: 'Eigenvalues',
    articleMarkdown: buildTechnicalArticle(
      'Invariant Span Lines: Av = λv',
      'Most vectors get knocked off their span during a linear transformation. Special vectors that remain on their original line and merely stretch by a scalar factor λ are eigenvectors.',
      'Eigenvalues',
      `A = np.array([[3, 1],
              [0, 2]])
eigenvalues, eigenvectors = np.linalg.eig(A)`,
      [
        'Av = λv rearranges to (A - λI)v = 0, requiring a non-trivial null space.',
        'Therefore λ is an eigenvalue if and only if det(A - λI) = 0.',
        'For a 3D rotation, the real eigenvector with λ = 1 is the physical axis of rotation.',
      ]
    ),
    quizQuestions: createLessonQuestions('la_15', 0, 1040, {
      q1Prompt: 'What is the geometric definition of an eigenvector v of a linear transformation A?',
      q1Options: [
        'A non-zero vector that remains on its own span line after applying A, merely getting stretched or squished by a scalar factor λ',
        'A vector that always gets rotated by 90 degrees',
        'A vector that gets mapped to [1, 1]',
        'Any column of the identity matrix',
      ],
      q1Correct: 0,
      q1Explanation: 'Av = λv states that the transformed vector Av points along the exact same line through the origin as v, scaled by eigenvalue λ.',
      q2Prompt: 'Why do we solve det(A - λI) = 0 to find the eigenvalues λ of matrix A?',
      q2Options: [
        'Because (A - λI)v = 0 has a non-zero eigenvector solution v if and only if the matrix (A - λI) squishes space into a lower dimension',
        'Because the determinant of A must always equal λ',
        'Because eigenvectors always have length 0',
        'To make the matrix symmetric',
      ],
      q2Correct: 0,
      q2Explanation: 'A non-trivial null space exists precisely when the transformation A - λI has zero determinant.',
    }),
  },
  {
    id: 'la_16',
    sequenceNumber: 16,
    title: 'Eigenbasis Diagonalization & Abstract Vector Spaces',
    summaryDescription: 'Compute high matrix powers effortlessly in an eigenbasis and generalize linearity to polynomials and functions.',
    durationSeconds: 960,
    youtubeVideoId: 'TgKwz5Ikpc8',
    startSeconds: 0,
    endSeconds: 960,
    conceptTag: 'Diagonalization',
    articleMarkdown: buildTechnicalArticle(
      'Diagonalization in an Eigenbasis & Function Spaces',
      'When we use a matrix’s own eigenvectors as our coordinate basis, the transformation matrix A⁻¹ M A becomes purely diagonal, with eigenvalues along the diagonal.',
      'Diagonalization',
      `# Raising a diagonal matrix to the 100th power takes O(n) scalar powers
D_100 = np.diag(eigenvalues ** 100)
A_100 = eigenvectors @ D_100 @ np.linalg.inv(eigenvectors)`,
      [
        'Diagonal matrices scale each coordinate axis independently with zero cross-terms.',
        'Derivatives and integrals are linear operators on the vector space of smooth functions.',
        'Satisfying the eight vector space axioms lets every geometric theorem apply to functions and quantum states.',
      ]
    ),
    quizQuestions: createLessonQuestions('la_16', 0, 960, {
      q1Prompt: 'What happens when you change basis into an eigenbasis (using a matrix’s linearly independent eigenvectors as the basis columns of P)?',
      q1Options: [
        'The conjugated transformation matrix P⁻¹ M P becomes a diagonal matrix whose diagonal entries are the eigenvalues',
        'The matrix becomes all zeros',
        'All eigenvalues become equal to 1',
        'The determinant drops to 0',
      ],
      q1Correct: 0,
      q1Explanation: 'In a coordinate system aligned with the eigenvectors, the transformation purely stretches each basis axis by its eigenvalue λ_i.',
      q2Prompt: 'Why is the derivative d/dx considered a linear operator on the vector space of smooth functions?',
      q2Options: [
        'Because d/dx(f + g) = df/dx + dg/dx and d/dx(c · f) = c · df/dx (it satisfies additivity and scalar scaling)',
        'Because the graph of every derivative is a straight line',
        'Because derivatives only apply to 2×2 matrices',
        'Because d/dx is always invertible',
      ],
      q2Correct: 0,
      q2Explanation: 'Any operator satisfying L(f + g) = L(f) + L(g) and L(cf) = cL(f) is linear, allowing matrix techniques to represent differential operators.',
    }),
  },
];

const typographyLessons: Lesson[] = Array.from({ length: 15 }, (_, idx) => {
  const title = [
    'Foundations of Swiss International Typographic Style',
    'Constructing Modular Column & Baseline Grids',
    'Optical Sizing, Display Serifs vs. Neo-Grotesque Sans',
    'Measure, Leading, and Rhythmic Vertical Spacing',
    'Typographic Hierarchy Without Color or Decoration',
    'Asymmetric Balance & Negative Space Tension',
    'Micro-Typography: Kerning, Tracking & Ligatures',
    'Tabular Numerals & Data-Dense Editorial Layouts',
    'Pairing High-Contrast Serifs with Utility Sans',
    'Responsive Fluid Type Scales with CSS Clamp',
    'Caption Architecture, Marginalia & Pull Quotes',
    'Designing Long-Form Reading Experiences',
    'Grid Breaking: When and How to Violate the Module',
    'Dark Mode Optical Weight Compensation',
    'Critiquing & Refining Editorial Design Systems',
  ][idx];
  const summary =
    'Apply classical Swiss grid methodology and optical typographic rules to modern digital product interfaces.';
  const tag = idx % 2 === 0 ? 'Grid Systems' : 'Typography';
  const startSeconds = idx * 60;
  const endSeconds = (idx + 1) * 60 + 120;
  const id = `typ_${idx + 1}`;
  return {
    id,
    sequenceNumber: idx + 1,
    title,
    summaryDescription: summary,
    durationSeconds: 660 + (idx % 5) * 90,
    youtubeVideoId: 'dQw4w9WgXcQ',
    startSeconds,
    endSeconds,
    conceptTag: tag,
    articleMarkdown: buildHumanitiesArticle(title, summary, tag, [
      'Maintain a comfortable reading measure between 60 and 72 characters per line.',
      'Anchor all multi-column text blocks to a shared 4px or 8px baseline grid.',
      'Establish clear hierarchy through size and whitespace before reaching for extra font weights.',
    ]),
    quizQuestions: createLessonQuestions(id, startSeconds, endSeconds, {
      q1Prompt: `In editorial ${tag.toLowerCase()}, what is the ideal line measure (width) for sustained body prose readability?`,
      q1Options: [
        '60 to 72 characters per line',
        '140 to 180 characters per line',
        '15 to 20 characters per line',
        'Full 1440px viewport width with no margin',
      ],
      q1Correct: 0,
      q1Explanation: 'A 60–72ch measure prevents eye fatigue when scanning across lines and avoids awkward hyphenation on overly narrow columns.',
      q2Prompt: 'Why should numerical columns in tables and dashboards use tabular numerals (tabular-nums)?',
      q2Options: [
        'So every digit 0–9 occupies the exact same horizontal advance width, aligning decimal points vertically across rows',
        'To italicize negative numbers automatically',
        'To compress line height by 50%',
        'To replace serif fonts with script calligraphy',
      ],
      q2Correct: 0,
      q2Explanation: 'Monospaced digit widths allow readers to compare magnitudes down a column without horizontal jitter.',
    }),
  };
});

const macroLessons: Lesson[] = Array.from({ length: 15 }, (_, idx) => {
  const title = [
    'Transactions: The Building Block of the Economic Machine',
    'Credit vs. Money: How Commercial Bank Lending Creates Credit',
    'Productivity Growth Over the Long Run',
    'The Short-Term Debt Cycle (5 to 8 Years)',
    'Inflation, Deflation & Central Bank Interest Rate Levers',
    'The Long-Term Debt Cycle & Secular Deleveraging',
    'Four Ways to Deleverage: Austerity, Defaults, Taxes, Printing',
    'Achieving a Beautiful Deleveraging Balance',
    'Sovereign Bond Markets & Yield Curve Inversions',
    'Reserve Currencies & Balance of Payments Dynamics',
    'Fiscal Policy Coordination with Monetary Stimulus',
    'Asset Price Bubbles & Wealth Effect Transmission',
    'Historical Case Study: The 1930s Great Depression',
    'Historical Case Study: 2008 Global Financial Crisis',
    'Three Rules of Thumb for Navigating Economic Cycles',
  ][idx];
  const summary =
    'Trace credit creation, debt servicing burdens, and central bank policy actions across historical market regimes.';
  const tag = idx % 2 === 0 ? 'Debt Cycles' : 'Monetary Policy';
  const startSeconds = idx * 90;
  const endSeconds = (idx + 1) * 90 + 180;
  const id = `mac_${idx + 1}`;
  return {
    id,
    sequenceNumber: idx + 1,
    title,
    summaryDescription: summary,
    durationSeconds: 600 + (idx % 4) * 110,
    youtubeVideoId: 'PHe0bXAIuk0',
    startSeconds,
    endSeconds,
    conceptTag: tag,
    articleMarkdown: buildHumanitiesArticle(title, summary, tag, [
      'Total spending equals money plus credit; price equals total spending divided by quantity sold.',
      'One person’s spending is another person’s income, creating self-reinforcing credit expansions.',
      'Balancing deflationary debt restructuring with measured money creation prevents disorderly depressions.',
    ]),
    quizQuestions: createLessonQuestions(id, startSeconds, endSeconds, {
      q1Prompt: 'In Ray Dalio’s economic template, how is the price of any good or asset determined in a market transaction?',
      q1Options: [
        'Total spending (money + credit) divided by the total quantity sold',
        'The central bank’s gold reserve multiplied by population size',
        'Strictly the amount of physical paper currency in circulation',
        'The 30-year Treasury yield minus corporate tax rates',
      ],
      q1Correct: 0,
      q1Explanation: 'Because credit spends just like cash, total spending (money + credit) divided by quantity sold sets the clearing price.',
      q2Prompt: 'What distinguishes a Long-Term Debt Cycle peak (deleveraging) from an ordinary Short-Term recession?',
      q2Options: [
        'Short-term interest rates have already hit 0%, so lowering rates further can no longer stimulate credit expansion',
        'Productivity growth permanently stops forever',
        'Commercial banks are prohibited from holding government bonds',
        'Inflation rises above 100% before any debt exists',
      ],
      q2Correct: 0,
      q2Explanation: 'In a deleveraging, debt burdens are so high and interest rates are already near 0% that standard rate cuts lose traction.',
    }),
  };
});

const classicalLessons: Lesson[] = Array.from({ length: 15 }, (_, idx) => {
  const title = [
    'Bronze Age Aegean: Minoan Palaces & Mycenaean Citadels',
    'Geometric to Archaic Greece: Rise of the Polis & Peripteral Temple',
    'Doric & Ionic Orders: Tectonics, Entasis & Optical Refinements',
    'The Athenian Acropolis: Parthenon, Propylaia & Erechtheion',
    'Civic Space in the Agora: Stoas, Bouleuterion & Theaters',
    'Hellenistic Urbanism: Pergamon, Alexandria & Priene',
    'Early Roman Architecture & Etruscan Temple Engineering',
    'The Roman Concrete Revolution: Opus Caementicium & Vaulting',
    'Forum Romanum & Imperial Forums of Augustus and Trajan',
    'Domestic Space in Pompeii and Herculaneum',
    'Roman Bath Complexes (Thermae) & Aqueduct Infrastructure',
    'The Colosseum & Amphitheater Crowd Engineering',
    'Hadrian’s Pantheon: Ocular Light & Hemispherical Dome Mastery',
    'Hadrian’s Villa at Tivoli & Provincial Urbanism',
    'Late Antiquity & Constantine’s Basilica Nova',
  ][idx];
  const summary =
    'Analyze structural breakthroughs, civic planning, and classical architectural orders across the ancient Mediterranean.';
  const tag = idx % 2 === 0 ? 'Classical Orders' : 'Urbanism';
  const startSeconds = idx * 80;
  const endSeconds = (idx + 1) * 80 + 160;
  const id = `cls_${idx + 1}`;
  return {
    id,
    sequenceNumber: idx + 1,
    title,
    summaryDescription: summary,
    durationSeconds: 750 + (idx % 5) * 80,
    youtubeVideoId: 'ZA-tUyM_y7s',
    startSeconds,
    endSeconds,
    conceptTag: tag,
    articleMarkdown: buildHumanitiesArticle(title, summary, tag, [
      'Greek post-and-lintel stone tectonics prioritized exterior sculptural perfection and optical entasis.',
      'Roman opus caementicium liberated interior volume through barrel vaults, groin vaults, and coffered domes.',
      'Civic monuments framed ritual processions and public assembly across Mediterranean urban centers.',
    ]),
    quizQuestions: createLessonQuestions(id, startSeconds, endSeconds, {
      q1Prompt: 'What is "entasis" in classical Greek Doric temple architecture such as the Parthenon?',
      q1Options: [
        'A subtle convex swelling along the shaft of a column that counteracts the optical illusion of concavity',
        'An underground drainage channel beneath the agora',
        'A brick-faced Roman concrete arch',
        'The triangular pediment above the eastern entrance',
      ],
      q1Correct: 0,
      q1Explanation: 'Entasis gives stone columns a slight mid-shaft curvature so they appear organically straight and muscular rather than pinched in bright sunlight.',
      q2Prompt: 'How did the builders of Hadrian’s Pantheon reduce the structural weight of its 43.3-meter unreinforced concrete dome?',
      q2Options: [
        'By tapering shell thickness toward the top, carving recessed coffers, and grading aggregate from heavy travertine at the base to light volcanic pumice near the oculus',
        'By supporting the center of the dome with four interior bronze columns',
        'By building the entire dome out of hollow timber beams',
        'By filling the rotunda with compacted earth permanently',
      ],
      q2Correct: 0,
      q2Explanation: 'Graduated aggregate density (travertine → tufa → pumice) and sunken coffering minimized outward hoop tension without sacrificing strength.',
    }),
  };
});

export const mockCourses: Course[] = [
  {
    id: 'crs_mit_algos',
    slug: 'mit-algorithms-data-structures',
    title: 'Introduction to Algorithms & Data Structures',
    description:
      'Transform MIT OpenCourseWare lectures into a structured daily study plan covering asymptotic notation, dynamic programming, and graph traversal.',
    youtubeUrl: 'https://www.youtube.com/watch?v=HtSuA80QTyo',
    youtubeVideoId: 'HtSuA80QTyo',
    channelName: 'MIT OpenCourseWare',
    thumbnailUrl: '',
    thumbnailTheme: 'cs',
    totalDuration: '4h 21m',
    totalDurationMinutes: 261,
    lessonCount: mitAlgorithmsLessons.length,
    learnerCount: 3420,
    category: 'Computer Science',
    difficulty: 'Intermediate',
    lessons: mitAlgorithmsLessons,
    createdAt: '2026-10-01T12:00:00Z',
  },
  {
    id: 'crs_karpathy_nn',
    slug: 'neural-networks-zero-to-hero',
    title: 'Neural Networks: Zero to Hero Complete Masterclass',
    description:
      'Step-by-step mastery of backpropagation, micrograd, makemore, and building a Generative Pre-trained Transformer from scratch in PyTorch.',
    youtubeUrl: 'https://www.youtube.com/watch?v=VMj-3S1tku0',
    youtubeVideoId: 'VMj-3S1tku0',
    channelName: 'Andrej Karpathy',
    thumbnailUrl: '',
    thumbnailTheme: 'ml',
    totalDuration: '4h 34m',
    totalDurationMinutes: 274,
    lessonCount: karpathyNeuralNetsLessons.length,
    learnerCount: 5890,
    category: 'Artificial Intelligence',
    difficulty: 'Advanced',
    lessons: karpathyNeuralNetsLessons,
    createdAt: '2026-10-04T15:30:00Z',
  },
  {
    id: 'crs_3b1b_linear_algebra',
    slug: 'essence-of-linear-algebra',
    title: 'Essence of Linear Algebra & Geometric Transformations',
    description:
      'Build deep visual intuition for eigenvalues, determinants, change of basis, and vector spaces with guided comprehension checkpoints.',
    youtubeUrl: 'https://www.youtube.com/watch?v=fNk_zzaMoSs',
    youtubeVideoId: 'fNk_zzaMoSs',
    channelName: '3Blue1Brown',
    thumbnailUrl: '',
    thumbnailTheme: 'physics',
    totalDuration: '3h 19m',
    totalDurationMinutes: 199,
    lessonCount: linearAlgebraLessons.length,
    learnerCount: 4710,
    category: 'Mathematics',
    difficulty: 'Intermediate',
    lessons: linearAlgebraLessons,
    createdAt: '2026-10-12T18:45:00Z',
  },
  {
    id: 'crs_typography_systems',
    slug: 'editorial-grid-systems-typography',
    title: 'Editorial Grid Systems & Swiss Typography Principles',
    description:
      'Learn modular grids, optical hierarchy, serif-to-sans pairings, and baseline rhythm for modern digital publications and web interfaces.',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    youtubeVideoId: 'dQw4w9WgXcQ',
    channelName: 'The Futur Academy',
    thumbnailUrl: '',
    thumbnailTheme: 'design',
    totalDuration: '3h 08m',
    totalDurationMinutes: 188,
    lessonCount: typographyLessons.length,
    learnerCount: 2150,
    category: 'Design Systems',
    difficulty: 'Beginner',
    lessons: typographyLessons,
    createdAt: '2026-10-09T10:00:00Z',
  },
  {
    id: 'crs_macro_dalio',
    slug: 'macroeconomic-cycles-debt-markets',
    title: 'Macroeconomic Cycles, Central Banking & Debt Markets',
    description:
      'Understand short-term and long-term debt cycles, fiscal policy levers, currency valuation, and historical market regime shifts.',
    youtubeUrl: 'https://www.youtube.com/watch?v=PHe0bXAIuk0',
    youtubeVideoId: 'PHe0bXAIuk0',
    channelName: 'Principles by Ray Dalio',
    thumbnailUrl: '',
    thumbnailTheme: 'economics',
    totalDuration: '2h 56m',
    totalDurationMinutes: 176,
    lessonCount: macroLessons.length,
    learnerCount: 1980,
    category: 'Economics',
    difficulty: 'Beginner',
    lessons: macroLessons,
    createdAt: '2026-10-18T08:15:00Z',
  },
  {
    id: 'crs_yale_antiquity',
    slug: 'classical-mediterranean-architecture',
    title: 'Architecture & Urbanism of the Classical Mediterranean',
    description:
      'Explore civic space, structural engineering, and classical aesthetics from Periclean Athens to Imperial Rome through curated lecture segments.',
    youtubeUrl: 'https://www.youtube.com/watch?v=ZA-tUyM_y7s',
    youtubeVideoId: 'ZA-tUyM_y7s',
    channelName: 'YaleCourses',
    thumbnailUrl: '',
    thumbnailTheme: 'history',
    totalDuration: '3h 27m',
    totalDurationMinutes: 207,
    lessonCount: classicalLessons.length,
    learnerCount: 1430,
    category: 'History & Architecture',
    difficulty: 'Beginner',
    lessons: classicalLessons,
    createdAt: '2026-10-22T14:20:00Z',
  },
];

export const mockRoadmaps: Roadmap[] = [
  {
    id: 'rdm_ai_eng',
    title: 'Foundations of Deep Learning & Language Models',
    subtitle: 'From linear algebra intuition to building transformer architectures from scratch',
    description:
      'A curated 6-week sequence combining 3Blue1Brown visual mathematics with Andrej Karpathy’s hands-on neural network implementation lectures.',
    estimatedWeeks: 6,
    totalHours: 24,
    courseIds: ['crs_3b1b_linear_algebra', 'crs_mit_algos', 'crs_karpathy_nn'],
    courseCount: 4,
    learnerCount: 2840,
    tags: ['Mathematics', 'PyTorch', 'Transformers'],
  },
  {
    id: 'rdm_design_eng',
    title: 'Design Engineering & Editorial Product Craft',
    subtitle: 'Master typographic hierarchy, spatial grids, and interactive UI motion systems',
    description:
      'Bridge the gap between classical Swiss editorial design and modern frontend component systems with structured daily study blocks.',
    estimatedWeeks: 4,
    totalHours: 14,
    courseIds: ['crs_typography_systems', 'crs_yale_antiquity'],
    courseCount: 3,
    learnerCount: 1690,
    tags: ['Typography', 'Grid Systems', 'UI Architecture'],
  },
  {
    id: 'rdm_cs_core',
    title: 'Computer Science Core & Systems Thinking',
    subtitle: 'Algorithmic complexity, memory hierarchies, and distributed systems fundamentals',
    description:
      'Ideal for self-taught engineers looking to solidify university-grade computer science fundamentals without losing momentum.',
    estimatedWeeks: 8,
    totalHours: 32,
    courseIds: ['crs_mit_algos', 'crs_macro_dalio'],
    courseCount: 5,
    learnerCount: 3120,
    tags: ['Algorithms', 'Data Structures', 'Systems'],
  },
];

export const mockNotes: TimestampNote[] = [
  {
    id: 'note_01',
    userId: 'usr_alex_01',
    courseId: 'crs_karpathy_nn',
    lessonId: 'nn_03',
    timestampSeconds: 1882,
    formattedTimestamp: '31:22',
    content:
      'The chain rule in backpropagation simply multiplies local gradients along the computation graph path.',
    createdAt: '2026-11-05T10:15:00Z',
    updatedAt: '2026-11-05T10:15:00Z',
  },
];

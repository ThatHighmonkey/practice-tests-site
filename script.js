// ===================================================================
// CompTIA Security+ practice test script
//
// This script powers the dynamic test generation, timer, per-question
// feedback and grading logic. It supports multi‑select questions and
// displays explanations immediately after the user submits their answer
// for a single question. A 90‑minute countdown timer is fixed to the
// top‑right of the page whenever a test is active.
// ===================================================================

// Questions will be populated from questions.js (questionsData)
let questions = [];

// Access control
// List of valid access codes. You can add or remove codes as needed.
// Only users who know one of these codes can access the practice tests.
const validAccessCodes = [
  // Default code for now. You can add more codes or change this value.
  'pumpkin spice'
];

// Flag to indicate whether the user has entered a valid code.
let accessGranted = false;

// Timer variables
let timerInterval = null;
let remainingTime = 0; // seconds remaining

// Tests array holds three generated tests
let tests = [];
let currentTestIndex = null;
let hasGeneratedTests = false;

// Attach event handlers once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const btnTest1 = document.getElementById('btn-test1');
  const btnTest2 = document.getElementById('btn-test2');
  const btnTest3 = document.getElementById('btn-test3');
  // Initially disable buttons until questions are loaded
  btnTest1.disabled = true;
  btnTest2.disabled = true;
  btnTest3.disabled = true;
  btnTest1.addEventListener('click', () => startTest(0));
  btnTest2.addEventListener('click', () => startTest(1));
  btnTest3.addEventListener('click', () => startTest(2));
  document.getElementById('submit-test').addEventListener('click', submitAnswers);
  // Handle return to home
  document.getElementById('back-home').addEventListener('click', () => {
    document.getElementById('test-container').style.display = 'none';
    document.getElementById('home').style.display = 'block';
    document.getElementById('result').innerHTML = '';
    // Clear any existing questions and feedback
    document.getElementById('test-form').innerHTML = '';
    // Stop the timer if it is running
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    document.getElementById('timer').textContent = '';
  });
  // Assign questions from the loaded script
  if (typeof questionsData !== 'undefined') {
    questions = questionsData;
    // Only enable test buttons once questions are loaded and access has been granted
    if (accessGranted) {
      btnTest1.disabled = false;
      btnTest2.disabled = false;
      btnTest3.disabled = false;
    }
  } else {
    console.error('questionsData is undefined. Ensure questions.js is loaded before script.js');
  }

  // Access code handling
  const accessBtn = document.getElementById('access-code-btn');
  if (accessBtn) {
    accessBtn.addEventListener('click', () => {
      const codeInputEl = document.getElementById('access-code-input');
      const errorEl = document.getElementById('access-code-error');
      const code = (codeInputEl.value || '').trim();
      // Compare case-insensitively for convenience
      const isValid = validAccessCodes.some((c) => c.toLowerCase() === code.toLowerCase());
      if (isValid) {
        accessGranted = true;
        // Hide the access gate and show the home view
        document.getElementById('access-gate').style.display = 'none';
        document.getElementById('home').style.display = 'block';
        // Enable test buttons if questions have loaded
        if (questions && questions.length > 0) {
          btnTest1.disabled = false;
          btnTest2.disabled = false;
          btnTest3.disabled = false;
        }
        // Clear any error message
        if (errorEl) errorEl.textContent = '';
      } else {
        // Invalid code: show error message
        if (errorEl) errorEl.textContent = 'Invalid code. Please try again.';
        // Clear input for privacy
        codeInputEl.value = '';
      }
    });
  }
});

/**
 * Shuffle array in place using Fisher-Yates algorithm.
 * @param {Array} array
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Update the timer display based on remainingTime.
 */
function updateTimerDisplay() {
  const timerEl = document.getElementById('timer');
  // Compute minutes and seconds
  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  timerEl.textContent = `Time left: ${mm}:${ss}`;
}

/**
 * Generate the three tests from the questions pool.
 * Test 1 and Test 2: unique sets of 90 questions each.
 * Test 3: remaining questions plus a random mix of questions from tests 1 and 2.
 */
function generateTests() {
  if (!questions || questions.length === 0) {
    alert('Questions have not been loaded yet.');
    return;
  }
  // Make a copy of questions and shuffle them for randomness
  const qCopy = shuffle([...questions]);
  const test1 = qCopy.slice(0, 90);
  const test2 = qCopy.slice(90, 180);
  const remaining = qCopy.slice(180);
  // For test3, take all remaining plus a mix of 15 random questions from test1 and 15 from test2
  const mixFromTest1 = shuffle([...test1]).slice(0, 15);
  const mixFromTest2 = shuffle([...test2]).slice(0, 15);
  const test3 = [...remaining, ...mixFromTest1, ...mixFromTest2];
  tests = [test1, test2, test3];
  hasGeneratedTests = true;
}

/**
 * Evaluate a single question and display feedback inline.
 *
 * When the user clicks the "Submit Answer" button for a question, this
 * function compares the selected option(s) against the correct answer(s),
 * displays whether the choice was correct or incorrect, and shows the
 * explanation. After evaluation, the button and input options are disabled
 * to prevent re‑submission.
 *
 * @param {number} questionIndex Index of the question within the current test
 */
function checkAnswer(questionIndex) {
  if (currentTestIndex === null) return;
  const test = tests[currentTestIndex];
  const q = test[questionIndex];
  const ansStr = (q.answer || '').replace(/\s+/g, '');
  // If there is no answer specified, do not grade (e.g., hotspot/simulation)
  if (ansStr.length === 0) {
    return;
  }
  const answerSet = new Set(ansStr.split(''));
  // Gather selected options
  const selectedInputs = document.querySelectorAll(`input[name="q${questionIndex}"]:checked`);
  const selectedSet = new Set(Array.from(selectedInputs).map((inp) => inp.value));
  let isCorrect = false;
  if (answerSet.size > 1) {
    if (selectedSet.size === answerSet.size) {
      isCorrect = Array.from(selectedSet).every((val) => answerSet.has(val));
    }
  } else {
    const answer = ansStr.charAt(0);
    isCorrect = selectedSet.has(answer);
  }
  // Build feedback message
  const feedbackEl = document.getElementById(`feedback-${questionIndex}`);
  if (!feedbackEl) return;
  let message = '';
  if (isCorrect) {
    message += '<span class="correct">Correct!</span> ';
  } else {
    message += '<span class="incorrect">Incorrect.</span> ';
  }
  if (q.explanation) {
    message += q.explanation;
  }
  feedbackEl.innerHTML = message;
  feedbackEl.style.display = 'block';
  // Disable the inputs to prevent changes after submission
  const inputs = document.querySelectorAll(`input[name="q${questionIndex}"]`);
  inputs.forEach((inp) => {
    inp.disabled = true;
  });
  // Disable the check button
  const btn = document.getElementById(`check-btn-${questionIndex}`);
  if (btn) {
    btn.disabled = true;
  }
}

/**
 * Start a particular test.
 * @param {number} index The test index (0 = test1, 1 = test2, 2 = test3)
 */
function startTest(index) {
  if (!hasGeneratedTests) {
    generateTests();
  }
  currentTestIndex = index;
  const testTitleEl = document.getElementById('test-title');
  testTitleEl.textContent = `Test ${index + 1}`;
  const container = document.getElementById('test-container');
  const home = document.getElementById('home');
  const form = document.getElementById('test-form');
  form.innerHTML = '';
  document.getElementById('result').innerHTML = '';
  // Build form content for each question in the test
  tests[index].forEach((q, idx) => {
    const block = document.createElement('div');
    block.className = 'question-block';
    const qNum = idx + 1;
    const h3 = document.createElement('h3');
    // Determine if multi‑select by checking length of answer string after removing whitespace
    const ansStr = (q.answer || '').replace(/\s+/g, '');
    const numAnswers = ansStr.length;
    let questionText = `${qNum}. ${q.question}`;
    if (numAnswers > 1) {
      questionText += ` (Select ${numAnswers})`;
    }
    h3.textContent = questionText;
    block.appendChild(h3);
    // Create options container if options exist
    const optsDiv = document.createElement('div');
    optsDiv.className = 'options';
    if (q.options && q.options.length > 0) {
      q.options.forEach((opt) => {
        const id = `q${idx}_${opt.option}`;
        const label = document.createElement('label');
        label.setAttribute('for', id);
        const inputEl = document.createElement('input');
        // Use checkbox for multi‑select questions
        inputEl.type = numAnswers > 1 ? 'checkbox' : 'radio';
        inputEl.name = `q${idx}`;
        inputEl.value = opt.option;
        inputEl.id = id;
        label.appendChild(inputEl);
        label.appendChild(document.createTextNode(` ${opt.option}. ${opt.text}`));
        const br = document.createElement('br');
        optsDiv.appendChild(label);
        optsDiv.appendChild(br);
      });
      block.appendChild(optsDiv);
      // Create a submit button for this question
      const checkBtn = document.createElement('button');
      checkBtn.type = 'button';
      checkBtn.className = 'check-answer-btn';
      checkBtn.id = `check-btn-${idx}`;
      checkBtn.textContent = 'Submit Answer';
      // Initially disabled until the user selects an option
      checkBtn.disabled = true;
      // Enable the button when any option is selected
      const inputs = [];
      // gather inputs after they are appended to DOM
      // we'll attach event listeners once the block is appended
      // Add a container for feedback
      const feedbackEl = document.createElement('div');
      feedbackEl.className = 'feedback';
      feedbackEl.id = `feedback-${idx}`;
      block.appendChild(checkBtn);
      block.appendChild(feedbackEl);
      // After adding the block, we will later attach listeners after DOM insertion
    } else {
      // For questions without selectable options (e.g., simulation/hotspot), display the explanation immediately
      if (q.explanation) {
        const feedbackEl = document.createElement('div');
        feedbackEl.className = 'feedback';
        feedbackEl.innerHTML = `<em>${q.explanation}</em>`;
        block.appendChild(feedbackEl);
      }
    }
    form.appendChild(block);
  });
  // Now that the blocks are part of the DOM, attach change listeners to enable check buttons
  tests[index].forEach((q, idx) => {
    if (q.options && q.options.length > 0) {
      const inputs = document.querySelectorAll(`input[name="q${idx}"]`);
      const btn = document.getElementById(`check-btn-${idx}`);
      inputs.forEach((inputEl) => {
        inputEl.addEventListener('change', () => {
          const anyChecked = Array.from(inputs).some((inp) => inp.checked);
          btn.disabled = !anyChecked;
        });
      });
      // Attach click handler to evaluate this question
      btn.addEventListener('click', () => {
        checkAnswer(idx);
      });
    }
  });
  // Show test container, hide home
  container.style.display = 'block';
  home.style.display = 'none';

  // Initialize and start the timer: 90 minutes = 5400 seconds
  remainingTime = 90 * 60;
  updateTimerDisplay();
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  timerInterval = setInterval(() => {
    remainingTime--;
    if (remainingTime <= 0) {
      clearInterval(timerInterval);
      // Time is up: auto-submit answers
      submitAnswers();
      // Disable submit button to prevent further submission
      document.getElementById('submit-test').disabled = true;
      document.getElementById('timer').textContent = 'Time is up!';
    } else {
      updateTimerDisplay();
    }
  }, 1000);

  // Ensure submit button is enabled when starting a test
  document.getElementById('submit-test').disabled = false;
}

/**
 * Grade the answers and display results.
 */
function submitAnswers(event) {
  if (event) {
    event.preventDefault();
  }
  if (currentTestIndex === null) return;
  // Stop the timer if it is running
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  const test = tests[currentTestIndex];
  let correctCount = 0;
  let gradedTotal = 0;
  const resultEl = document.getElementById('result');
  resultEl.innerHTML = '';
  // Evaluate each question
  test.forEach((q, idx) => {
    const answerStr = (q.answer || '').replace(/\s+/g, '');
    if (answerStr.length === 0) {
      // Skip ungraded questions (no definitive answer)
      return;
    }
    gradedTotal++;
    const answerSet = new Set(answerStr.split(''));
    const selectedInputs = document.querySelectorAll(`input[name="q${idx}"]:checked`);
    const selectedSet = new Set(Array.from(selectedInputs).map((inp) => inp.value));
    let isCorrect = false;
    if (answerSet.size > 1) {
      if (selectedSet.size === answerSet.size) {
        isCorrect = Array.from(selectedSet).every((val) => answerSet.has(val));
      }
    } else {
      const answer = Array.from(answerSet)[0];
      isCorrect = selectedSet.has(answer);
    }
    if (isCorrect) {
      correctCount++;
    }
  });
  // Build summary. Use gradedTotal for denominator to avoid penalizing ungraded questions
  const scorePercent = gradedTotal > 0 ? Math.round((correctCount / gradedTotal) * 100) : 0;
  const summary = document.createElement('p');
  summary.innerHTML = `<strong>Score:</strong> ${correctCount} / ${gradedTotal} (${scorePercent}%)`;
  resultEl.appendChild(summary);
  // Provide detailed feedback for each graded question
  const details = document.createElement('div');
  test.forEach((q, idx) => {
    const answerStr = (q.answer || '').replace(/\s+/g, '');
    const p = document.createElement('p');
    if (answerStr.length === 0) {
      p.innerHTML = `<strong>Q${idx + 1}:</strong> <em>Ungraded question</em>`;
      details.appendChild(p);
      return;
    }
    const answerSet = new Set(answerStr.split(''));
    const selectedInputs = document.querySelectorAll(`input[name="q${idx}"]:checked`);
    const selectedSet = new Set(Array.from(selectedInputs).map((inp) => inp.value));
    let isCorrect = false;
    if (answerSet.size > 1) {
      if (selectedSet.size === answerSet.size) {
        isCorrect = Array.from(selectedSet).every((val) => answerSet.has(val));
      }
    } else {
      const answer = Array.from(answerSet)[0];
      isCorrect = selectedSet.has(answer);
    }
    p.innerHTML = `<strong>Q${idx + 1}:</strong> ${isCorrect ? '<span class="correct">Correct</span>' : '<span class="incorrect">Incorrect</span>'}`;
    details.appendChild(p);
  });
  resultEl.appendChild(details);
}
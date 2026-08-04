const PHASE_PROMPTS = {
  explore: `You are a Socratic learning guide for a concept the user is exploring.

Your ONLY job in this phase is to ask questions. You must never directly state facts,
definitions, or explanations about the concept. You may not answer the user's questions
directly - instead, respond with a question that helps them find the answer themselves.

Rules:
- Ask one question at a time. Never more than one.
- Questions should build on what the user just said.
- If the user asks you to just tell them the answer, refuse warmly and redirect with a question.
- If the user seems stuck, ask a simpler, more foundational question.
- Keep responses short - 1 to 3 sentences maximum.
- Your tone is warm, curious, and encouraging. Never condescending.

You are in the EXPLORE phase. The user is just beginning to engage with this concept.`,

  construct: `You are a Socratic learning guide helping a user construct their understanding.

The user has begun forming an explanation. Your job is to stress-test it - find the gaps,
surface the contradictions, and ask questions that strengthen or challenge their model.

Rules:
- You may acknowledge what is correct in the user's explanation, briefly.
- You must then find one weakness, gap, or untested assumption and ask about it.
- Ask one question at a time. Never more than one.
- Do not give the answer to your own question.
- Keep responses to 2 to 4 sentences maximum.
- Be direct but encouraging. You are a rigorous but kind critic.

You are in the CONSTRUCT phase. The user is building their understanding.`,

  confirm: `You are a Socratic learning guide confirming a user's understanding.

The user has demonstrated genuine understanding of this concept. Your job is to:
1. Confirm what they have understood correctly (1-2 sentences).
2. Gently correct anything that is slightly off (if anything).
3. Ask one final question: what does this concept connect to or remind them of
   from something they already understand?

This final question is important - it is how new nodes are born in their knowledge graph.

Rules:
- Be warm and affirming. This is a moment of genuine accomplishment.
- The correction (if any) should feel like a refinement, not a failure.
- End always with the connection question.
- Keep the total response to 3 to 5 sentences.

You are in the CONFIRM phase. The user has earned this.`
};

function buildSystemPrompt(phase, nodeTitle, nodeSummary, neighbours) {
  const phasePrompt = PHASE_PROMPTS[phase] || PHASE_PROMPTS.explore;

  let context = `\nThe concept being explored is: "${nodeTitle}".`;

  if (nodeSummary) {
    context += `\nThe user's current understanding summary: "${nodeSummary}".`;
  }

  if (neighbours && neighbours.length > 0) {
    const neighbourList = neighbours
      .map(n => `"${n.title}"${n.summary ? `: ${n.summary}` : ''}`)
      .join('\n- ');
    context += `\n\nRelated concepts this user already has in their graph:\n- ${neighbourList}`;
    context += `\nYou may reference these related concepts when asking questions or making connections.`;
  }

  return phasePrompt + context;
}

function buildClassifierPrompt(message) {
  return `You are a classifier. Respond with only a single JSON object, nothing else.

Analyze this message and determine:
1. Does it contain a genuine attempt to explain or define a concept in the user's own words?
2. If yes, how strong is the explanation? (weak / moderate / strong)

Message: "${message}"

Respond with exactly this JSON format:
{"is_explanation": true or false, "strength": "weak" or "moderate" or "strong" or null}

Nothing else. No preamble. No markdown. Just the JSON object.`;
}

/**
 * SPRINT 1: CONCEPT SYNTHESIZER
 * Builds the prompt used by the background worker to update the persistent conceptual state.
 */
function buildSynthesisPrompt({ nodeTitle, currentState, recentMessages }) {
  // Use a default state if the node has never been synthesized before.
  const baseState = currentState || {
    current_summary: "",
    frontier: [],
    personal_lexicon: [],
    version: 0
  };

  const messagesText = recentMessages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  return `You are a "Concept Synthesizer." Your job is to evolve the user's persistent understanding of the concept: "${nodeTitle}".

---
CURRENT STATE:
${JSON.stringify(baseState, null, 2)}

---
RECENT CONVERSATION:
${messagesText}

---
TASK:
Update the CURRENT STATE based on the RECENT CONVERSATION.

INSTRUCTIONS:
1. "current_summary": Write ONLY about this specific concept "${nodeTitle}".
   Do NOT reference other concepts the user has discussed unless they
   directly explain THIS concept. Write in first person from the user's
   perspective. Use the user's own words, analogies, and phrasing.
   Max 200 characters. Be concise and personal.
2. "frontier": Identify 2-3 specific unresolved questions or gaps
   that emerged about THIS concept specifically. Be precise.
3. "personal_lexicon": Extract words, metaphors, or analogies the
   user used specifically when talking about THIS concept.
4. "version": Increment by 1.
5. PRESERVATION: If the conversation is too short or lacks insight,
   return CURRENT STATE exactly as is but increment version.
6. CRITICAL: The summary must sound like the USER explaining the concept
   in their own words - not a teacher summarising what the student missed.
   WRONG: "The user struggles to understand X"
   RIGHT: "X means showing only what is needed - like a button that does
   something without exposing the event handlers behind it"

OUTPUT:
Respond with ONLY a single JSON object. No markdown. No preamble. No code fences.

{
  "current_summary": "...",
  "frontier": ["...", "..."],
  "personal_lexicon": ["...", "..."],
  "version": ${baseState.version + 1}
}`;
}

module.exports = { 
  buildSystemPrompt, 
  buildClassifierPrompt,
  buildSynthesisPrompt 
};


function buildStageAwareSystemPrompt(phase, nodeTitle, nodeSummary, neighbours, mviState, cognitiveStage, evaluatorResult, lastUserMessage, learnerProfile) {

  const STAGE_INSTRUCTIONS = {
    1: `The learner is at Stage 1 (Ignition). Your job is to spark curiosity
and give them a foothold - something concrete to hold onto.

Rules:
- If the user has expressed any understanding, even vague, build on it with one question.
- If the user says "I don't know", "I have no idea", "I don't understand",
  or explicitly asks you to explain - STOP asking questions.
  Instead: give one clear, simple, concrete explanation using an everyday analogy.
  Then ask one small question to check if it landed.
- Keep responses to 2-3 sentences maximum.
- Never ask more than one question.
- Tone: warm, patient, encouraging.`,
    2: `The learner is at Stage 2 (Confusion Identified). They know what they
don't know. Your job is to hold them in productive discomfort - but
only if they have something to work with.

Rules:
- If the user has named their confusion, ask a question that makes the gap more precise.
- If the user says "I don't know" or asks for a direct explanation,
  give one concrete statement that gives them a foothold, then ask one question.
- Never ask more than one question.
- Do not rescue them too quickly - but do not leave them with nothing either.
- Keep responses to 2-4 sentences maximum.`,
    3: `The learner is at Stage 3 (Model Constructed). They have a working
explanation. Your job is to stress-test it.

Rules:
- Find the weakest assumption in their explanation and probe it.
- Ask one targeted question only.
- You may acknowledge what is correct briefly before probing.
- Do not give the answer to your own question.
- Keep responses to 2-4 sentences maximum.`,
    4: `The learner is at Stage 4 (Predictive). They can predict outcomes.
Your job is to push toward the edges of their model.

Rules:
- Introduce an edge case or change one variable.
- Ask what happens under that condition.
- One question only.
- Keep responses to 2-4 sentences maximum.`,
    5: `The learner is at Stage 5 (Mastery). Engage as a peer and expert.

Rules:
- You may state facts directly.
- Challenge their assumptions and engage in real debate.
- Do not simplify. They have earned full intellectual engagement.
- Match their energy and depth.`,
  };

  const stageInstruction = STAGE_INSTRUCTIONS[cognitiveStage] || STAGE_INSTRUCTIONS[1];

  let prompt = `You are a Socratic learning guide.

COGNITIVE STAGE INSTRUCTION:
${stageInstruction}
`;

  prompt += `
CONVERSATION RHYTHM - CRITICAL:
Follow this pattern strictly:
1. Explain one thing clearly using a concrete analogy or example
2. Then check if it landed with ONE question maximum
3. If user shows understanding - explain the next layer
4. If user shows confusion - try a DIFFERENT angle, not the same question rephrased
5. Never ask two questions in a row without explaining something in between
6. Your response should feel like talking WITH the user not AT them
7. Match the user's energy - if they are excited, be engaged. If they are lost, be patient and direct.
`;

  if (evaluatorResult?.misconception_detected && evaluatorResult.misconception_detail) {
    prompt += `
MISCONCEPTION DETECTED: ${evaluatorResult.misconception_detail}
Your question must force the learner to treat these as separate concepts.
Do not tell them they are wrong. Ask a question that makes the distinction visible.
`;
  }

  if (evaluatorResult?.suggested_question_type) {
    const QUESTION_GUIDANCE = {
      ignite_curiosity: 'Ask something that makes them want to know more.',
      name_the_gap: 'Ask them to name exactly what they do not understand yet.',
      stress_test: 'Find the weakest assumption in their explanation and probe it.',
      change_variable: 'Ask what happens when one variable in their model changes.',
      find_boundary: 'Ask where their model breaks down or stops applying.',
      peer_challenge: 'Challenge their framing directly as an intellectual equal.',
    };
    prompt += `\nQUESTION APPROACH: ${QUESTION_GUIDANCE[evaluatorResult.suggested_question_type]}\n`;
  }

  prompt += `\nConcept: "${nodeTitle}"`;

  if (mviState?.current_summary) {
    prompt += `\nEvolved understanding so far: "${mviState.current_summary.slice(0, 500)}"`;
  } else if (nodeSummary) {
    prompt += `\nInitial description: "${nodeSummary}"`;
  }

  if (mviState?.frontier?.length > 0) {
    prompt += `\nOpen conceptual leads: ${mviState.frontier.slice(0, 3).join(', ')}`;
  }

  if (neighbours?.length > 0) {
    const nList = neighbours.map(n => n.title).join(', ');
    prompt += `\nRelated concepts in graph: ${nList}`;
  }

  // Detect explicit confusion signals
  const confusionSignals = [
    'i don\'t know',
    'i dont know',
    'i have no idea',
    'i don\'t understand',
    'i dont understand',
    'please explain',
    'can you explain',
    'just tell me',
    'explain it to me',
    'i give up',
    'i\'m lost',
    'im lost',
    'i\'m confused',
    'im confused',
    'help me understand',
  ];

  // Check last user message for confusion signals
  const lastMessageLower = (lastUserMessage || '').toLowerCase();
  const userIsLost = confusionSignals.some(signal =>
    lastMessageLower.includes(signal)
  );

  if (userIsLost && cognitiveStage < 4) {
    prompt += `\nUSER IS LOST - SWITCH TO TEACHER MODE:
Do not ask any question in this response.
Explain the concept directly in 2-3 sentences using a concrete everyday analogy.
End with a statement like "Take a moment with that" or "Does that picture make sense."
Never end with a question mark in this response.\n`;
  }

  if (learnerProfile?.thinking_style?.dominant) {
    const style = learnerProfile.thinking_style.dominant;
    const tone = learnerProfile.dominant_tone?.[0]?.tone || 'neutral';

    const styleMap = {
      spatial: 'Use physical, spatial analogies. Describe things in terms of movement and space.',
      sequential: 'Use step-by-step explanations. Number your points.',
      contrast: 'Explain by contrast - what this is vs what it is not.',
      analogy: 'Always anchor to something familiar first before introducing the new concept.',
    };

    const toneMap = {
      frustrated: 'Be patient and direct. Short responses. No complexity right now.',
      lost: 'Slow down. Simpler language. Confirm before moving forward.',
      excited: 'Match their energy. Build momentum. Make connections.',
      curious: 'Feed curiosity. Hint at depth.',
      confident: 'Introduce slight challenge.',
    };

    if (styleMap[style]) prompt += `\nSTYLE: ${styleMap[style]}\n`;
    if (toneMap[tone]) prompt += `TONE: ${toneMap[tone]}\n`;
  }

  if (cognitiveStage < 5 && !(userIsLost && cognitiveStage < 4)) {
    prompt += `\n\nIMPORTANT: Ask ONE question only. Do not give the answer. Do not explain the concept directly.`;
  }

  return prompt;
}

module.exports = {
  buildSystemPrompt,
  buildClassifierPrompt,
  buildSynthesisPrompt,
  buildStageAwareSystemPrompt,
};

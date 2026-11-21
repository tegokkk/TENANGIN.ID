import { badRequest } from '../../../lib/errors.js';

/**
 * Menghitung skor instrumen skrining berversi di server.
 * Aturan PRD F2-AC3: jawaban kosong tidak dianggap nol; item wajib yang kosong menandai respons sebagai incomplete.
 */
export function scoreScreeningResponse(instrument, answersMap) {
  const items = Array.isArray(instrument.items) ? instrument.items : [];
  const rules = instrument.scoring_rules || {};
  const requiredIds = items.filter((item) => item.required !== false).map((item) => item.id);

  let answeredCount = 0;
  let totalScore = 0;
  let missingRequired = false;
  const sanitizedAnswers = {};

  for (const item of items) {
    const rawVal = answersMap?.[item.id];
    if (rawVal === undefined || rawVal === null || rawVal === '') {
      if (requiredIds.includes(item.id)) {
        missingRequired = true;
      }
      continue;
    }

    const numericVal = Number(rawVal);
    const min = Number(item.min ?? rules.scaleMin ?? 0);
    const max = Number(item.max ?? rules.scaleMax ?? 3);

    if (!Number.isInteger(numericVal) || numericVal < min || numericVal > max) {
      throw badRequest(`Nilai jawaban untuk item "${item.id}" di luar rentang instrumen.`);
    }

    const effective = item.reverseScored ? max + min - numericVal : numericVal;
    sanitizedAnswers[item.id] = numericVal;
    totalScore += effective;
    answeredCount += 1;
  }

  if (answeredCount === 0) {
    throw badRequest('Pilih minimal satu jawaban sebelum mengirimkan skrining.');
  }

  if (missingRequired) {
    return {
      scoreStatus: 'incomplete',
      computedScore: null,
      interpretationLabel: instrument.is_simulation
        ? 'Simulasi belum lengkap — bukan hasil penilaian'
        : 'Belum lengkap',
      supportMessage:
        rules.incompleteMessage ||
        'Sebagian pertanyaan belum dijawab sehingga nilai tidak dihitung sebagai nol. Kamu bisa melengkapinya nanti atau menghubungi layanan sekolah bila perlu.',
      sanitizedAnswers,
    };
  }

  let interpretationLabel = instrument.is_simulation
    ? 'Simulasi selesai (bukan penilaian nyata)'
    : 'Ringkasan deskriptif tersedia';
  let supportMessage =
    rules.defaultSupportMessage ||
    'Hasil ini bersifat deskriptif dan bukan diagnosis medis. Layanan bantuan selalu tersedia kapan pun kamu ingin berdiskusi.';

  if (Array.isArray(rules.bands)) {
    const matched = rules.bands.find((band) => totalScore >= band.min && totalScore <= band.max);
    if (matched) {
      interpretationLabel = matched.label;
      supportMessage = matched.supportMessage || supportMessage;
    }
  }

  return {
    scoreStatus: 'complete',
    computedScore: totalScore,
    interpretationLabel,
    supportMessage,
    sanitizedAnswers,
  };
}

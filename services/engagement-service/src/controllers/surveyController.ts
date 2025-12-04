import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Survey from '../models/Survey';
import SurveyResponse from '../models/SurveyResponse';

export const createSurvey = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const survey = new Survey({
      ...req.body,
      tenantId,
      questions: req.body.questions?.map((q: any) => ({ ...q, id: q.id || uuidv4() })) || []
    });
    await survey.save();
    res.status(201).json({ success: true, data: survey });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create survey', error });
  }
};

export const getSurveys = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { status, type, page = 1, limit = 20 } = req.query;
    const query: any = { tenantId };
    if (status) query.status = status;
    if (type) query.type = type;

    const surveys = await Survey.find(query)
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);
    const total = await Survey.countDocuments(query);

    res.json({ success: true, data: surveys, pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch surveys', error });
  }
};

export const getSurvey = async (req: Request, res: Response) => {
  try {
    const survey = await Survey.findById(req.params.surveyId);
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found' });
    res.json({ success: true, data: survey });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch survey', error });
  }
};

export const updateSurvey = async (req: Request, res: Response) => {
  try {
    const survey = await Survey.findByIdAndUpdate(req.params.surveyId, req.body, { new: true });
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found' });
    res.json({ success: true, data: survey });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update survey', error });
  }
};

export const deleteSurvey = async (req: Request, res: Response) => {
  try {
    const survey = await Survey.findByIdAndDelete(req.params.surveyId);
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found' });
    await SurveyResponse.deleteMany({ surveyId: req.params.surveyId });
    res.json({ success: true, message: 'Survey deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete survey', error });
  }
};

export const publishSurvey = async (req: Request, res: Response) => {
  try {
    const survey = await Survey.findById(req.params.surveyId);
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found' });
    if (survey.questions.length === 0) return res.status(400).json({ success: false, message: 'Survey must have at least one question' });

    const now = new Date();
    survey.status = survey.schedule.startDate <= now ? 'active' : 'scheduled';
    await survey.save();
    res.json({ success: true, data: survey });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to publish survey', error });
  }
};

export const closeSurvey = async (req: Request, res: Response) => {
  try {
    const survey = await Survey.findByIdAndUpdate(req.params.surveyId, { status: 'closed' }, { new: true });
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found' });
    res.json({ success: true, data: survey });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to close survey', error });
  }
};

export const submitResponse = async (req: Request, res: Response) => {
  try {
    const survey = await Survey.findById(req.params.surveyId);
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found' });
    if (survey.status !== 'active') return res.status(400).json({ success: false, message: 'Survey is not active' });

    const { tenantId } = req.params;
    const { employeeId, answers, metadata } = req.body;

    if (!survey.settings.allowMultipleResponses && employeeId) {
      const existing = await SurveyResponse.findOne({ surveyId: survey._id, employeeId });
      if (existing) return res.status(400).json({ success: false, message: 'You have already responded to this survey' });
    }

    const response = new SurveyResponse({
      tenantId,
      surveyId: survey._id,
      employeeId: survey.settings.anonymous ? undefined : employeeId,
      anonymous: survey.settings.anonymous,
      answers,
      metadata,
      completedAt: new Date(),
      startedAt: req.body.startedAt || new Date(),
      timeSpentSeconds: req.body.timeSpentSeconds,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    await response.save();

    survey.responseCount += 1;
    await survey.save();

    res.status(201).json({ success: true, data: { id: response._id }, message: 'Response submitted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to submit response', error });
  }
};

export const getSurveyResults = async (req: Request, res: Response) => {
  try {
    const survey = await Survey.findById(req.params.surveyId);
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found' });

    const responses = await SurveyResponse.find({ surveyId: survey._id, completedAt: { $ne: null } });

    const questionResults = survey.questions.map(question => {
      const questionResponses = responses.map(r => r.answers.find(a => a.questionId === question.id)).filter(Boolean);
      const result: any = { questionId: question.id, questionText: question.text, type: question.type, totalResponses: questionResponses.length };

      if (question.type === 'rating' || question.type === 'scale') {
        const values = questionResponses.map(a => +a!.value).filter(v => !isNaN(v));
        result.average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        result.distribution = {};
        for (let i = question.scaleMin || 1; i <= (question.scaleMax || 5); i++) {
          result.distribution[i] = values.filter(v => v === i).length;
        }
      } else if (question.type === 'multiple_choice' || question.type === 'yes_no') {
        result.distribution = {};
        questionResponses.forEach(a => {
          const val = String(a!.value);
          result.distribution[val] = (result.distribution[val] || 0) + 1;
        });
      } else if (question.type === 'text') {
        result.responses = questionResponses.map(a => a!.value);
      }

      return result;
    });

    const eNPS = survey.type === 'eNPS' ? calculateENPS(responses, survey.questions[0]?.id) : null;

    res.json({
      success: true,
      data: {
        surveyId: survey._id,
        title: survey.title,
        totalResponses: responses.length,
        completionRate: survey.responseCount > 0 ? (responses.length / survey.responseCount) * 100 : 0,
        averageTimeSpent: responses.reduce((acc, r) => acc + (r.timeSpentSeconds || 0), 0) / (responses.length || 1),
        questionResults,
        eNPS,
        byDepartment: groupByMetadata(responses, 'department'),
        byDesignation: groupByMetadata(responses, 'designation')
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch results', error });
  }
};

function calculateENPS(responses: any[], questionId?: string): { score: number; promoters: number; passives: number; detractors: number } | null {
  if (!questionId) return null;
  const scores = responses.map(r => r.answers.find((a: any) => a.questionId === questionId)?.value).filter(v => v !== undefined).map(Number);
  if (scores.length === 0) return null;
  const promoters = scores.filter(s => s >= 9).length;
  const detractors = scores.filter(s => s <= 6).length;
  const passives = scores.length - promoters - detractors;
  return { score: Math.round(((promoters - detractors) / scores.length) * 100), promoters, passives, detractors };
}

function groupByMetadata(responses: any[], field: string): Record<string, number> {
  const groups: Record<string, number> = {};
  responses.forEach(r => {
    const value = r.metadata?.[field] || 'Unknown';
    groups[value] = (groups[value] || 0) + 1;
  });
  return groups;
}

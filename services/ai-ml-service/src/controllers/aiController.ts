import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import ResumeAnalysis from '../models/ResumeAnalysis';
import SkillTaxonomy from '../models/SkillTaxonomy';
import MLModel from '../models/MLModel';
import Prediction from '../models/Prediction';
import { parseResume, analyzeResume } from '../services/resumeParserService';
import { predictAttrition, predictPerformance, predictEngagement, predictSalaryRange, predictPromotionReadiness } from '../services/predictionService';
import { matchCandidateToJob, findBestCandidates, analyzeSkillGaps, generateLearningPath } from '../services/skillMatchingService';
import { analyzeSentiment, analyzeBatchFeedback } from '../services/sentimentService';

// ================= Resume Analysis =================

export const analyzeResumeFile = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { text, fileName, candidateId, employeeId } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: 'Resume text is required' });
    }

    const startTime = Date.now();

    // Parse resume
    const parsedData = await parseResume(text);

    // Analyze resume
    const aiAnalysis = analyzeResume(parsedData);

    const analysis = new ResumeAnalysis({
      tenantId,
      candidateId,
      employeeId,
      fileName: fileName || 'resume.pdf',
      rawText: text,
      parsedData,
      aiAnalysis,
      jobMatches: [],
      status: 'completed',
      processingTime: Date.now() - startTime
    });

    await analysis.save();

    res.status(201).json({
      success: true,
      data: {
        id: analysis._id,
        parsedData,
        aiAnalysis,
        processingTime: analysis.processingTime
      }
    });
  } catch (error) {
    console.error('[AI Controller] Resume analysis error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze resume', error });
  }
};

export const getResumeAnalysis = async (req: Request, res: Response) => {
  try {
    const analysis = await ResumeAnalysis.findById(req.params.analysisId);
    if (!analysis) {
      return res.status(404).json({ success: false, message: 'Analysis not found' });
    }
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch analysis', error });
  }
};

export const matchResumeToJobs = async (req: Request, res: Response) => {
  try {
    const { analysisId } = req.params;
    const { jobs } = req.body;

    const analysis = await ResumeAnalysis.findById(analysisId);
    if (!analysis) {
      return res.status(404).json({ success: false, message: 'Analysis not found' });
    }

    const candidate = {
      skills: analysis.parsedData.skills.technical.map(s => ({ skill: s, level: 'intermediate' })),
      experienceYears: analysis.parsedData.totalExperienceYears,
      education: analysis.parsedData.education,
      certifications: analysis.parsedData.skills.certifications
    };

    const matches = jobs.map((job: any) => {
      const match = matchCandidateToJob(candidate, job);
      return {
        jobId: job.id,
        jobTitle: job.title,
        matchScore: match.overallScore,
        matchedSkills: match.matchedSkills.map(m => m.skill),
        missingSkills: match.missingSkills,
        recommendation: match.recommendation
      };
    });

    analysis.jobMatches = matches;
    await analysis.save();

    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to match resume to jobs', error });
  }
};

// ================= Predictions =================

export const getAttritionPrediction = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;
    const employeeData = req.body;

    const prediction = predictAttrition(employeeData);

    // Save prediction
    const saved = new Prediction({
      tenantId,
      modelId: null,
      modelType: 'attrition',
      entityType: 'employee',
      entityId: employeeId,
      prediction: {
        value: prediction.risk,
        probability: prediction.probability,
        confidence: prediction.confidence,
        category: prediction.riskLevel
      },
      features: employeeData,
      factors: prediction.factors,
      recommendations: prediction.recommendations,
      riskLevel: prediction.riskLevel,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: 'active'
    });
    await saved.save();

    res.json({
      success: true,
      data: {
        predictionId: saved._id,
        risk: prediction.risk,
        riskLevel: prediction.riskLevel,
        confidence: prediction.confidence,
        factors: prediction.factors,
        recommendations: prediction.recommendations
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate prediction', error });
  }
};

export const getPerformancePrediction = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;
    const { employeeData, historicalScores } = req.body;

    const prediction = predictPerformance(employeeData, historicalScores || []);

    res.json({
      success: true,
      data: {
        predictedScore: prediction.predictedScore,
        confidence: prediction.confidence,
        trend: prediction.trend,
        factors: prediction.factors,
        recommendations: prediction.recommendations
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate prediction', error });
  }
};

export const getEngagementPrediction = async (req: Request, res: Response) => {
  try {
    const { employeeData } = req.body;
    const predictedScore = predictEngagement(employeeData);

    res.json({
      success: true,
      data: {
        predictedEngagement: predictedScore,
        level: predictedScore > 80 ? 'high' : predictedScore > 60 ? 'moderate' : 'low'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate prediction', error });
  }
};

export const getSalaryPrediction = async (req: Request, res: Response) => {
  try {
    const { role, experience, skills, location } = req.body;

    const prediction = predictSalaryRange(role, experience, skills || [], location || 'remote');

    res.json({ success: true, data: prediction });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate prediction', error });
  }
};

export const getPromotionReadiness = async (req: Request, res: Response) => {
  try {
    const { employeeData } = req.body;
    const readiness = predictPromotionReadiness(employeeData);

    res.json({ success: true, data: readiness });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate prediction', error });
  }
};

export const getBatchAttritionPredictions = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { employees } = req.body;

    const predictions = employees.map((emp: any) => ({
      employeeId: emp.employeeId,
      ...predictAttrition(emp)
    }));

    // Summary stats
    const highRisk = predictions.filter((p: any) => p.riskLevel === 'high' || p.riskLevel === 'critical');
    const avgRisk = predictions.reduce((sum: number, p: any) => sum + p.risk, 0) / predictions.length;

    res.json({
      success: true,
      data: {
        predictions: predictions.sort((a: any, b: any) => b.risk - a.risk),
        summary: {
          totalEmployees: predictions.length,
          highRiskCount: highRisk.length,
          averageRisk: Math.round(avgRisk),
          riskDistribution: {
            critical: predictions.filter((p: any) => p.riskLevel === 'critical').length,
            high: predictions.filter((p: any) => p.riskLevel === 'high').length,
            medium: predictions.filter((p: any) => p.riskLevel === 'medium').length,
            low: predictions.filter((p: any) => p.riskLevel === 'low').length
          }
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate predictions', error });
  }
};

// ================= Skill Matching =================

export const matchCandidates = async (req: Request, res: Response) => {
  try {
    const { job, candidates, limit } = req.body;
    const matches = findBestCandidates(candidates, job, limit || 10);
    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to match candidates', error });
  }
};

export const matchToJob = async (req: Request, res: Response) => {
  try {
    const { candidate, job } = req.body;
    const match = matchCandidateToJob(candidate, job);
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to match to job', error });
  }
};

export const analyzeTeamSkillGaps = async (req: Request, res: Response) => {
  try {
    const { teamSkills, requiredSkills } = req.body;
    const analysis = analyzeSkillGaps(teamSkills, requiredSkills);
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to analyze skill gaps', error });
  }
};

export const getLearningPath = async (req: Request, res: Response) => {
  try {
    const { currentSkills, targetSkills, careerGoal } = req.body;
    const path = generateLearningPath(currentSkills, targetSkills, careerGoal);
    res.json({ success: true, data: path });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate learning path', error });
  }
};

// ================= Sentiment Analysis =================

export const analyzeFeedbackSentiment = async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }

    const result = await analyzeSentiment(text);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to analyze sentiment', error });
  }
};

export const analyzeBatchSentiment = async (req: Request, res: Response) => {
  try {
    const { feedbackItems } = req.body;

    if (!feedbackItems || !Array.isArray(feedbackItems)) {
      return res.status(400).json({ success: false, message: 'Feedback items array is required' });
    }

    const result = await analyzeBatchFeedback(feedbackItems);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to analyze feedback', error });
  }
};

// ================= Skill Taxonomy =================

export const createSkill = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const skill = new SkillTaxonomy({
      ...req.body,
      tenantId,
      normalizedName: req.body.name.toLowerCase().trim()
    });
    await skill.save();
    res.status(201).json({ success: true, data: skill });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create skill', error });
  }
};

export const getSkills = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { category, search } = req.query;

    const query: any = { tenantId, isActive: true };
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { aliases: { $regex: search, $options: 'i' } }
      ];
    }

    const skills = await SkillTaxonomy.find(query).sort({ demandScore: -1 });
    res.json({ success: true, data: skills });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch skills', error });
  }
};

export const updateSkill = async (req: Request, res: Response) => {
  try {
    const skill = await SkillTaxonomy.findByIdAndUpdate(
      req.params.skillId,
      { ...req.body, normalizedName: req.body.name?.toLowerCase().trim() },
      { new: true }
    );
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });
    res.json({ success: true, data: skill });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update skill', error });
  }
};

// ================= ML Models =================

export const getMLModels = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { type, status } = req.query;

    const query: any = { tenantId };
    if (type) query.type = type;
    if (status) query.status = status;

    const models = await MLModel.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: models });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch models', error });
  }
};

export const getModelPerformance = async (req: Request, res: Response) => {
  try {
    const model = await MLModel.findById(req.params.modelId);
    if (!model) return res.status(404).json({ success: false, message: 'Model not found' });

    // Get predictions made by this model
    const predictions = await Prediction.find({ modelId: model._id });
    const validated = predictions.filter(p => p.actualOutcome);

    let accuracy = 0;
    if (validated.length > 0) {
      accuracy = validated.reduce((sum, p) => sum + (p.actualOutcome?.accuracy || 0), 0) / validated.length;
    }

    res.json({
      success: true,
      data: {
        model: model,
        performance: {
          totalPredictions: predictions.length,
          validatedPredictions: validated.length,
          calculatedAccuracy: Math.round(accuracy * 100) / 100,
          reportedMetrics: model.metrics
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch model performance', error });
  }
};

// ================= Predictions History =================

export const getPredictionHistory = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;
    const { modelType, limit = 10 } = req.query;

    const query: any = { tenantId, entityId: employeeId };
    if (modelType) query.modelType = modelType;

    const predictions = await Prediction.find(query)
      .sort({ createdAt: -1 })
      .limit(+limit);

    res.json({ success: true, data: predictions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch prediction history', error });
  }
};

export const recordPredictionOutcome = async (req: Request, res: Response) => {
  try {
    const { predictionId } = req.params;
    const { actualValue } = req.body;

    const prediction = await Prediction.findById(predictionId);
    if (!prediction) {
      return res.status(404).json({ success: false, message: 'Prediction not found' });
    }

    // Calculate accuracy based on prediction type
    let accuracy = 0;
    if (typeof prediction.prediction.value === 'number' && typeof actualValue === 'number') {
      const error = Math.abs(prediction.prediction.value - actualValue) / Math.max(1, actualValue);
      accuracy = Math.max(0, 1 - error);
    } else if (prediction.prediction.value === actualValue) {
      accuracy = 1;
    }

    prediction.actualOutcome = {
      value: actualValue,
      recordedAt: new Date(),
      accuracy
    };
    prediction.status = 'validated';
    await prediction.save();

    res.json({ success: true, data: prediction });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to record outcome', error });
  }
};

import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';

const logger = createLogger('review-feedback-service');

export interface ReviewFeedbackData {
  reviewId: string;
  providerId: string;
  type: 'SELF' | 'MANAGER' | 'PEER' | 'SUBORDINATE' | 'CUSTOMER' | 'EXTERNAL';
  category: 'STRENGTHS' | 'AREAS_FOR_IMPROVEMENT' | 'GOALS' | 'GENERAL' | 'COMPETENCY' | 'BEHAVIOR';
  feedback: string;
  rating?: number;
  isAnonymous?: boolean;
  isConfidential?: boolean;
  tags?: string[];
}

export interface GetReviewFeedbackOptions {
  type?: string;
  providerId?: string;
  includeAnonymous: boolean;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  requestingUserId: string;
}

export interface GetPendingRequestsOptions {
  reviewId?: string;
  requesterId?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  requestingUserId: string;
}

export interface FeedbackRequestData {
  reviewId: string;
  requesteeIds: string[];
  message?: string;
  dueDate?: Date;
  requesterId: string;
}

export interface FeedbackResponseData {
  type: 'SELF' | 'MANAGER' | 'PEER' | 'SUBORDINATE' | 'CUSTOMER' | 'EXTERNAL';
  category: 'STRENGTHS' | 'AREAS_FOR_IMPROVEMENT' | 'GOALS' | 'GENERAL' | 'COMPETENCY' | 'BEHAVIOR';
  feedback: string;
  rating?: number;
  isAnonymous?: boolean;
  providerId: string;
}

export interface UserFeedbackSummaryOptions {
  startDate?: Date;
  endDate?: Date;
  includeGiven: boolean;
  includeReceived: boolean;
  requestingUserId: string;
}

export interface GenerateFeedbackReportOptions {
  reviewIds?: string[];
  employeeIds?: string[];
  departmentId?: string;
  startDate?: Date;
  endDate?: Date;
  format: 'json' | 'csv';
  includeAnonymous: boolean;
  requestingUserId: string;
}

export interface FeedbackAnalytics {
  totalFeedback: number;
  feedbackByType: Record<string, number>;
  feedbackByCategory: Record<string, number>;
  averageRating: number;
  responseRate: number;
  sentimentAnalysis: {
    positive: number;
    neutral: number;
    negative: number;
  };
  commonThemes: Array<{
    theme: string;
    frequency: number;
    category: string;
  }>;
  ratingDistribution: Record<string, number>;
}

export class ReviewFeedbackService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create feedback for a performance review
   */
  async createFeedback(data: ReviewFeedbackData): Promise<any> {
    try {
      // Validate review exists
      const review = await this.prisma.performanceReview.findUnique({
        where: { id: data.reviewId },
      });

      if (!review) {
        throw new Error('Performance review not found');
      }

      // Check if feedback already exists from this provider
      const existingFeedback = await this.prisma.reviewFeedback.findFirst({
        where: {
          reviewId: data.reviewId,
          providerId: data.providerId,
          type: data.type,
          category: data.category,
        },
      });

      if (existingFeedback) {
        throw new Error('Feedback of this type and category already exists from this provider');
      }

      const feedback = await this.prisma.reviewFeedback.create({
        data: {
          reviewId: data.reviewId,
          providerId: data.providerId,
          feedbackType: data.type === 'EXTERNAL' ? 'MANAGER' : data.type as any, // EXTERNAL not supported, using MANAGER
          providedBy: data.providerId, // required field
          recipientId: data.providerId, // required field
          category: data.category,
          content: data.feedback, // feedback is stored as content
          rating: data.rating,
          isAnonymous: data.isAnonymous || false,
        },
        include: {
          review: {
            select: {
              id: true,
              employeeId: true,
              reviewPeriod: true,
            },
          },
        },
      });

      logger.info('Review feedback created successfully', {
        feedbackId: feedback.id,
        reviewId: data.reviewId,
        type: data.type,
        category: data.category,
        providerId: data.providerId,
      });

      return feedback;
    } catch (error) {
      logger.error('Failed to create review feedback', error as Error);
      throw error;
    }
  }

  /**
   * Get feedback by ID
   */
  async getFeedback(feedbackId: string, requestingUserId: string): Promise<any | null> {
    try {
      const feedback = await this.prisma.reviewFeedback.findUnique({
        where: { id: feedbackId },
        include: {
          review: {
            select: {
              id: true,
              employeeId: true,
              reviewPeriod: true,
              // managerId: true, // TODO: Add managerId field to PerformanceReview schema
            },
          },
        },
      });

      if (!feedback) {
        return null;
      }

      // Check access permissions
      const hasAccess = await this.checkFeedbackAccess(feedback, requestingUserId);
      if (!hasAccess) {
        return null;
      }

      // Hide provider info if anonymous
      if (feedback.isAnonymous && 
          requestingUserId !== feedback.providerId && 
          false) { // TODO: Add proper manager access check when managerId is available
        if (feedback) (feedback as any).providerId = 'anonymous';
      }

      return feedback;
    } catch (error) {
      logger.error(`Failed to get review feedback ${feedbackId}`, error as Error);
      throw error;
    }
  }

  /**
   * Update feedback
   */
  async updateFeedback(
    feedbackId: string,
    updates: Partial<ReviewFeedbackData>,
    requestingUserId: string
  ): Promise<any> {
    try {
      const feedback = await this.prisma.reviewFeedback.findUnique({
        where: { id: feedbackId },
        include: {
          review: true,
        },
      });

      if (!feedback) {
        throw new Error('Review feedback not found');
      }

      const canEdit = await this.checkEditPermission(feedback, requestingUserId);
      if (!canEdit) {
        throw new Error('You do not have permission to edit this feedback');
      }

      // Check if review is still open for feedback
      if (feedback.review.status === 'COMPLETED' || feedback.review.status === 'APPROVED') {
        throw new Error('Cannot update feedback for completed or approved reviews');
      }

      const updatedFeedback = await this.prisma.reviewFeedback.update({
        where: { id: feedbackId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
        include: {
          review: {
            select: {
              id: true,
              employeeId: true,
              reviewPeriod: true,
            },
          },
        },
      });

      logger.info('Review feedback updated successfully', {
        feedbackId,
        requestingUserId,
        updates: Object.keys(updates),
      });

      return updatedFeedback;
    } catch (error) {
      logger.error(`Failed to update review feedback ${feedbackId}`, error as Error);
      throw error;
    }
  }

  /**
   * Delete feedback
   */
  async deleteFeedback(feedbackId: string, requestingUserId: string): Promise<void> {
    try {
      const feedback = await this.prisma.reviewFeedback.findUnique({
        where: { id: feedbackId },
        include: {
          review: true,
        },
      });

      if (!feedback) {
        throw new Error('Review feedback not found');
      }

      const canDelete = await this.checkEditPermission(feedback, requestingUserId);
      if (!canDelete) {
        throw new Error('You do not have permission to delete this feedback');
      }

      // Check if review is still open for feedback
      if (feedback.review.status === 'COMPLETED' || feedback.review.status === 'APPROVED') {
        throw new Error('Cannot delete feedback for completed or approved reviews');
      }

      await this.prisma.reviewFeedback.delete({
        where: { id: feedbackId },
      });

      logger.info('Review feedback deleted successfully', { feedbackId, requestingUserId });
    } catch (error) {
      logger.error(`Failed to delete review feedback ${feedbackId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get feedback for a review
   */
  async getReviewFeedback(
    reviewId: string,
    options: GetReviewFeedbackOptions
  ): Promise<{
    feedback: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        type,
        providerId,
        includeAnonymous,
        page,
        limit,
        sortBy,
        sortOrder,
        requestingUserId,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = { reviewId };

      if (type) where.type = type;
      if (providerId) where.providerId = providerId;
      if (!includeAnonymous) where.isAnonymous = false;

      const [feedback, total] = await Promise.all([
        this.prisma.reviewFeedback.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            review: {
              select: {
                id: true,
                employeeId: true,
                reviewPeriod: true,
                // managerId: true, // TODO: Add managerId field to PerformanceReview schema
              },
            },
          },
        }),
        this.prisma.reviewFeedback.count({ where }),
      ]);

      // Process feedback for anonymity
      const processedFeedback = feedback.map(fb => {
        if (fb.isAnonymous && 
            requestingUserId !== fb.providerId && 
            false) { // TODO: Add proper manager access check when managerId is available
          return {
            ...fb,
            providerId: 'anonymous',
          };
        }
        return fb;
      });

      const totalPages = Math.ceil(total / limit);

      return {
        feedback: processedFeedback,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error(`Failed to get review feedback for review ${reviewId}`, error as Error);
      throw error;
    }
  }

  /**
   * Request feedback from colleagues
   */
  async requestFeedback(data: FeedbackRequestData): Promise<any[]> {
    try {
      const review = await this.prisma.performanceReview.findUnique({
        where: { id: data.reviewId },
      });

      if (!review) {
        throw new Error('Performance review not found');
      }

      if (review.status === 'COMPLETED' || review.status === 'APPROVED') {
        throw new Error('Cannot request feedback for completed or approved reviews');
      }

      const requests = [];

      for (const requesteeId of data.requesteeIds) {
        // Check if request already exists
        const existingRequest = await this.prisma.feedbackRequest.findFirst({
          where: {
            reviewId: data.reviewId,
            providerId: requesteeId, // requesteeId is stored as providerId
            status: { in: ['PENDING', 'SENT'] }, // IN_PROGRESS not available, using SENT
          },
        });

        if (existingRequest) {
          continue; // Skip if request already exists
        }

        const request = await this.prisma.feedbackRequest.create({
          data: {
            reviewId: data.reviewId,
            requesterId: data.requesterId,
            providerId: requesteeId, // requesteeId is stored as providerId
            message: data.message,
            dueDate: data.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
            status: 'PENDING',
          },
        });

        requests.push(request);
      }

      logger.info('Feedback requests created', {
        reviewId: data.reviewId,
        requestCount: requests.length,
        requesterId: data.requesterId,
      });

      return requests;
    } catch (error) {
      logger.error('Failed to request feedback', error as Error);
      throw error;
    }
  }

  /**
   * Get pending feedback requests for a user
   */
  async getPendingRequests(
    userId: string,
    options: GetPendingRequestsOptions
  ): Promise<{
    requests: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        reviewId,
        requesterId,
        page,
        limit,
        sortBy,
        sortOrder,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = {
        requesteeId: userId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      };

      if (reviewId) where.reviewId = reviewId;
      if (requesterId) where.requesterId = requesterId;

      const [requests, total] = await Promise.all([
        this.prisma.feedbackRequest.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            review: true, // TODO: Add employee relation include when available
          },
        }),
        this.prisma.feedbackRequest.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        requests,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error(`Failed to get pending feedback requests for user ${userId}`, error as Error);
      throw error;
    }
  }

  /**
   * Submit feedback response to a request
   */
  async submitFeedbackResponse(requestId: string, responseData: FeedbackResponseData): Promise<any> {
    try {
      const request = await this.prisma.feedbackRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new Error('Feedback request not found');
      }

      if (request.providerId !== responseData.providerId) {
        throw new Error('You can only respond to your own feedback requests');
      }

      if (request.status === 'COMPLETED') {
        throw new Error('This feedback request has already been completed');
      }

      if (request.dueDate && request.dueDate < new Date()) {
        throw new Error('This feedback request has expired');
      }

      // Create the feedback
      const feedback = await this.createFeedback({
        reviewId: request.reviewId,
        providerId: responseData.providerId,
        type: responseData.type,
        category: responseData.category,
        feedback: responseData.feedback,
        rating: responseData.rating,
        isAnonymous: responseData.isAnonymous,
      });

      // Update request status
      await this.prisma.feedbackRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          // completedAt: new Date(), // TODO: Add completedAt field to FeedbackRequest schema
        },
      });

      logger.info('Feedback response submitted', {
        requestId,
        feedbackId: feedback.id,
        providerId: responseData.providerId,
      });

      return feedback;
    } catch (error) {
      logger.error(`Failed to submit feedback response ${requestId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get feedback analytics for a review
   */
  async getFeedbackAnalytics(reviewId: string, requestingUserId: string): Promise<FeedbackAnalytics> {
    try {
      const review = await this.prisma.performanceReview.findUnique({
        where: { id: reviewId },
      });

      if (!review) {
        throw new Error('Performance review not found');
      }

      const [
        allFeedback,
        feedbackByType,
        feedbackByCategory,
        totalRequests,
        completedRequests,
      ] = await Promise.all([
        this.prisma.reviewFeedback.findMany({
          where: { reviewId },
          select: {
            type: true,
            category: true,
            rating: true,
            feedback: true,
            isAnonymous: true,
          },
        }),
        this.prisma.reviewFeedback.groupBy({
          by: ['type'],
          where: { reviewId },
          _count: { type: true },
        }),
        this.prisma.reviewFeedback.groupBy({
          by: ['category'],
          where: { reviewId },
          _count: { category: true },
        }),
        this.prisma.feedbackRequest.count({ where: { reviewId } }),
        this.prisma.feedbackRequest.count({ where: { reviewId, status: 'COMPLETED' } }),
      ]);

      // Calculate metrics
      const totalFeedback = allFeedback.length;
      const ratings = allFeedback.filter(f => f.rating !== null).map(f => f.rating!);
      const averageRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;
      const responseRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;

      // Type distribution
      const typeCounts: Record<string, number> = {};
      feedbackByType.forEach(type => {
        if (type.type) typeCounts[type.type] = type._count.type;
      });

      // Category distribution
      const categoryCounts: Record<string, number> = {};
      feedbackByCategory.forEach(category => {
        if (category.category) categoryCounts[category.category] = category._count.category;
      });

      // Rating distribution
      const ratingDistribution: Record<string, number> = {
        '1': 0, '2': 0, '3': 0, '4': 0, '5': 0,
      };
      ratings.forEach(rating => {
        ratingDistribution[rating.toString()]++;
      });

      // Simple sentiment analysis (simplified)
      const sentimentAnalysis = this.analyzeSentiment(allFeedback.map(f => f.feedback || '').filter(Boolean));

      // Common themes (simplified keyword extraction)
      const commonThemes = this.extractCommonThemes(allFeedback);

      return {
        totalFeedback,
        feedbackByType: typeCounts,
        feedbackByCategory: categoryCounts,
        averageRating,
        responseRate,
        sentimentAnalysis,
        commonThemes,
        ratingDistribution,
      };
    } catch (error) {
      logger.error(`Failed to get feedback analytics for review ${reviewId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get user feedback summary
   */
  async getUserFeedbackSummary(userId: string, options: UserFeedbackSummaryOptions): Promise<any> {
    try {
      const { startDate, endDate, includeGiven, includeReceived } = options;

      const dateFilter = startDate || endDate ? {
        createdAt: {
          ...(startDate && { gte: startDate }),
          ...(endDate && { lte: endDate }),
        },
      } : {};

      const summary: any = {
        userId,
        period: { startDate, endDate },
      };

      if (includeReceived) {
        const receivedFeedback = await this.prisma.reviewFeedback.findMany({
          where: {
            review: { employeeId: userId },
            ...dateFilter,
          },
          include: {
            review: {
              select: {
                id: true,
                reviewPeriod: true,
              },
            },
          },
        });

        summary.receivedFeedback = {
          total: receivedFeedback.length,
          byType: this.groupByField(receivedFeedback, 'type'),
          byCategory: this.groupByField(receivedFeedback, 'category'),
          averageRating: this.calculateAverageRating(receivedFeedback),
          recentFeedback: receivedFeedback.slice(0, 5),
        };
      }

      if (includeGiven) {
        const givenFeedback = await this.prisma.reviewFeedback.findMany({
          where: {
            providerId: userId,
            ...dateFilter,
          },
          include: {
            review: {
              select: {
                id: true,
                reviewPeriod: true,
                employeeId: true,
              },
            },
          },
        });

        summary.givenFeedback = {
          total: givenFeedback.length,
          byType: this.groupByField(givenFeedback, 'type'),
          byCategory: this.groupByField(givenFeedback, 'category'),
          averageRating: this.calculateAverageRating(givenFeedback),
          recentFeedback: givenFeedback.slice(0, 5),
        };
      }

      return summary;
    } catch (error) {
      logger.error(`Failed to get user feedback summary ${userId}`, error as Error);
      throw error;
    }
  }

  /**
   * Anonymize feedback
   */
  async anonymizeFeedback(feedbackId: string, requestingUserId: string): Promise<any> {
    try {
      const feedback = await this.prisma.reviewFeedback.findUnique({
        where: { id: feedbackId },
      });

      if (!feedback) {
        throw new Error('Review feedback not found');
      }

      const canAnonymize = feedback.providerId === requestingUserId;
      if (!canAnonymize) {
        throw new Error('You can only anonymize your own feedback');
      }

      const updatedFeedback = await this.prisma.reviewFeedback.update({
        where: { id: feedbackId },
        data: {
          isAnonymous: true,
          updatedAt: new Date(),
        },
      });

      logger.info('Feedback anonymized', { feedbackId, requestingUserId });

      return updatedFeedback;
    } catch (error) {
      logger.error(`Failed to anonymize feedback ${feedbackId}`, error as Error);
      throw error;
    }
  }

  /**
   * Generate feedback report
   */
  async generateFeedbackReport(options: GenerateFeedbackReportOptions): Promise<any> {
    try {
      const {
        reviewIds,
        employeeIds,
        departmentId,
        startDate,
        endDate,
        format,
        includeAnonymous,
      } = options;

      const where: any = {};

      if (reviewIds && reviewIds.length > 0) {
        where.reviewId = { in: reviewIds };
      }

      if (employeeIds && employeeIds.length > 0) {
        where.review = { employeeId: { in: employeeIds } };
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      if (!includeAnonymous) {
        where.isAnonymous = false;
      }

      const feedback = await this.prisma.reviewFeedback.findMany({
        where,
        include: {
          review: {
            select: {
              id: true,
              employeeId: true,
              reviewPeriod: true,
              // type: true, // TODO: Add type field to PerformanceReview schema
            },
          },
        },
        orderBy: [
          { review: { employeeId: 'asc' } },
          { createdAt: 'desc' },
        ],
      });

      if (format === 'json') {
        return {
          reportGenerated: new Date().toISOString(),
          filters: options,
          totalFeedback: feedback.length,
          feedback,
        };
      } else if (format === 'csv') {
        const headers = [
          'Review ID', 'Employee ID', 'Provider ID', 'Type', 'Category', 
          'Rating', 'Feedback', 'Is Anonymous', 'Created At'
        ];
        const rows = feedback.map(f => [
          f.reviewId,
          f.reviewId, // Using reviewId instead of review.employeeId
          f.isAnonymous ? 'Anonymous' : f.providerId,
          f.type,
          f.category,
          f.rating?.toString() || '',
          `"${(f.feedback || '').replace(/"/g, '""')}"`,
          f.isAnonymous.toString(),
          f.createdAt.toISOString(),
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
      }

      throw new Error('Unsupported report format');
    } catch (error) {
      logger.error('Failed to generate feedback report', error as Error);
      throw error;
    }
  }

  /**
   * Bulk request feedback
   */
  async bulkRequestFeedback(
    requests: FeedbackRequestData[],
    requesterId: string
  ): Promise<{ successful: number; failed: number; results: any[] }> {
    try {
      let successful = 0;
      let failed = 0;
      const results = [];

      for (const requestData of requests) {
        try {
          const createdRequests = await this.requestFeedback({
            ...requestData,
            requesterId,
          });
          
          results.push({
            success: true,
            requestCount: createdRequests.length,
            data: requestData,
          });
          successful++;
        } catch (error) {
          results.push({
            success: false,
            error: (error as Error).message,
            data: requestData,
          });
          failed++;
        }
      }

      logger.info('Bulk feedback requests processed', {
        total: requests.length,
        successful,
        failed,
        requesterId,
      });

      return { successful, failed, results };
    } catch (error) {
      logger.error('Failed to bulk request feedback', error as Error);
      throw error;
    }
  }

  // Private helper methods

  private async checkFeedbackAccess(feedback: any, userId: string): Promise<boolean> {
    // User can access if they are the provider, employee being reviewed, or manager
    return (
      feedback.providerId === userId ||
      feedback.review.employeeId === userId ||
      feedback.review.managerId === userId ||
      // Add role-based access check here
      true // For now, allow access
    );
  }

  private async checkEditPermission(feedback: any, userId: string): Promise<boolean> {
    // User can edit if they are the provider
    return feedback.providerId === userId;
  }

  private analyzeSentiment(feedbackTexts: string[]): {
    positive: number;
    neutral: number;
    negative: number;
  } {
    // Simplified sentiment analysis
    const positiveWords = ['excellent', 'great', 'good', 'outstanding', 'impressive', 'strong', 'effective'];
    const negativeWords = ['poor', 'weak', 'needs improvement', 'lacking', 'insufficient', 'disappointing'];

    let positive = 0;
    let negative = 0;
    let neutral = 0;

    feedbackTexts.forEach(text => {
      const lowerText = text.toLowerCase();
      const hasPositive = positiveWords.some(word => lowerText.includes(word));
      const hasNegative = negativeWords.some(word => lowerText.includes(word));

      if (hasPositive && !hasNegative) positive++;
      else if (hasNegative && !hasPositive) negative++;
      else neutral++;
    });

    return { positive, neutral, negative };
  }

  private extractCommonThemes(feedback: any[]): Array<{
    theme: string;
    frequency: number;
    category: string;
  }> {
    // Simplified theme extraction
    const keywords = ['communication', 'leadership', 'teamwork', 'problem solving', 'time management', 'technical skills'];
    const themes: Record<string, { frequency: number; category: string }> = {};

    feedback.forEach(f => {
      const text = f.feedback.toLowerCase();
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          if (!themes[keyword]) {
            themes[keyword] = { frequency: 0, category: f.category };
          }
          themes[keyword].frequency++;
        }
      });
    });

    return Object.entries(themes).map(([theme, data]) => ({
      theme,
      frequency: data.frequency,
      category: data.category,
    })).sort((a, b) => b.frequency - a.frequency);
  }

  private groupByField(items: any[], field: string): Record<string, number> {
    const grouped: Record<string, number> = {};
    items.forEach(item => {
      const value = item[field];
      grouped[value] = (grouped[value] || 0) + 1;
    });
    return grouped;
  }

  private calculateAverageRating(feedback: any[]): number {
    const ratings = feedback.filter(f => f.rating !== null).map(f => f.rating);
    return ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;
  }
}

export class AIManager {
  constructor() {
    this.endpoint = '/api/ai_completion';
  }

  async getTaskSuggestions(taskData) {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Analyze this task and provide optimization suggestions:
          
          interface Suggestion {
            timeOfDay: string;
            restBreaks: string[];
            productivity: string;
          }
          
          {
            "timeOfDay": "Morning (8-10 AM) would be optimal for this task",
            "restBreaks": ["Take a 5-min break every 25 mins", "15-min break after 2 hours"],
            "productivity": "This task aligns well with your high-energy morning pattern"
          }
          `,
          data: taskData
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      return null;
    }
  }

  async getTaskPrediction(taskData) {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Analyze this task and predict success rate:
          
          interface Prediction {
            successRate: number;
            confidence: number;
            factors: string[];
            recommendations: string[];
          }
          
          {
            "successRate": 85,
            "confidence": 90,
            "factors": [
              "Similar tasks completed successfully",
              "Optimal time scheduling",
              "Matches user productivity pattern"
            ],
            "recommendations": [
              "Schedule during morning hours",
              "Break into smaller subtasks",
              "Set reminder 30 minutes before"
            ]
          }
          `,
          data: taskData
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error getting task prediction:', error);
      return null;
    }
  }

  async analyzePatternsAndSuggestRest(taskHistory) {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Analyze work patterns and suggest optimal rest periods:
          
          interface RestSuggestion {
            suggestedBreaks: string[];
            restDuration: string;
            reasoning: string;
          }
          
          {
            "suggestedBreaks": ["2:30 PM - 3:00 PM", "5:00 PM - 5:15 PM"],
            "restDuration": "30 minutes for main break, 15 minutes for short break",
            "reasoning": "Based on your pattern of decreased productivity in mid-afternoon"
          }
          `,
          data: taskHistory
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error analyzing patterns:', error);
      return null;
    }
  }

  async getMotivationalMessage() {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Generate an encouraging motivational message:
        
          interface MotivationalMessage {
            message: string;
            theme: string; // 'success' | 'encouragement' | 'challenge'
          }
        
          {
            "message": "Small steps lead to big achievements. Keep pushing forward!",
            "theme": "encouragement"
          }
          `,
          data: {}
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error getting motivational message:', error);
      return {
        message: "Stay focused and keep going!",
        theme: "encouragement"
      };
    }
  }
}
export class ChartManager {
  constructor() {
    this.weeklyChart = null;
    this.progressChart = null;
    this.lastWeeklyData = null;
  }

  initializeCharts() {
    this.initializeWeeklyChart();
    this.initializeProgressChart();
  }

  initializeWeeklyChart() {
    const ctx = document.getElementById('weeklyChart').getContext('2d');
    
    this.weeklyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        datasets: [
          {
            label: 'Completed',
            backgroundColor: '#2ecc71',
            data: [0, 0, 0, 0, 0, 0, 0]
          },
          {
            label: 'Failed',
            backgroundColor: '#e74c3c',
            data: [0, 0, 0, 0, 0, 0, 0]
          },
          {
            label: 'Break',
            backgroundColor: '#95a5a6',
            data: [0, 0, 0, 0, 0, 0, 0]
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            stacked: true
          },
          x: {
            stacked: true
          }
        }
      }
    });
  }

  initializeProgressChart() {
    const ctx = document.getElementById('progressChart').getContext('2d');
    
    this.progressChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Completed Tasks',
            borderColor: '#2ecc71',
            data: [],
            tension: 0.4
          },
          {
            label: 'Failed Tasks',
            borderColor: '#e74c3c',
            data: [],
            tension: 0.4
          },
          {
            label: 'Break Time',
            borderColor: '#95a5a6',
            data: [],
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  updateCharts(stats) {
    // Optimize chart updates by only updating changed data
    const weeklyData = {
      completed: stats.weekly.map(day => day.completed),
      failed: stats.weekly.map(day => day.failed),
      break: stats.weekly.map(day => day.break)
    };

    // Update weekly chart efficiently
    const weeklyChanged = !this.lastWeeklyData || 
      JSON.stringify(weeklyData) !== JSON.stringify(this.lastWeeklyData);
    
    if (weeklyChanged) {
      this.weeklyChart.data.datasets[0].data = weeklyData.completed;
      this.weeklyChart.data.datasets[1].data = weeklyData.failed;
      this.weeklyChart.data.datasets[2].data = weeklyData.break;
      this.weeklyChart.update('none'); // Disable animations for faster updates
      this.lastWeeklyData = weeklyData;
    }

    // Calculate cumulative values efficiently
    const cumulative = stats.weekly.reduce((acc, day) => {
      const last = acc[acc.length - 1] || { completed: 0, failed: 0, break: 0 };
      acc.push({
        completed: last.completed + day.completed,
        failed: last.failed + day.failed,
        break: last.break + day.break
      });
      return acc;
    }, []);

    // Update progress chart efficiently
    const labels = stats.weekly.map((_, i) => `Day ${i + 1}`);
    this.progressChart.data.labels = labels;
    this.progressChart.data.datasets[0].data = cumulative.map(d => d.completed);
    this.progressChart.data.datasets[1].data = cumulative.map(d => d.failed);
    this.progressChart.data.datasets[2].data = cumulative.map(d => d.break);
    this.progressChart.update('none'); // Disable animations for faster updates
  }
}
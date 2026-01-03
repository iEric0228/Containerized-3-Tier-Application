import express from 'express';
import axios from 'axios';

const router = express.Router();

// Get metrics from Prometheus
router.get('/prometheus', async (req, res) => {
  try {
    const prometheusUrl = 'http://prometheus:9090';
    
    // Query CPU usage
    const cpuResponse = await axios.get(`${prometheusUrl}/api/v1/query?query=rate(cpu_usage_seconds_total[5m]) * 100`);
    
    // Query memory usage
    const memoryResponse = await axios.get(`${prometheusUrl}/api/v1/query?query=(memory_usage_bytes / memory_total_bytes) * 100`);
    
    // Query request rate
    const requestsResponse = await axios.get(`${prometheusUrl}/api/v1/query?query=rate(http_requests_total[5m])`);
    
    res.json({
      cpu: cpuResponse.data.data.result,
      memory: memoryResponse.data.data.result,
      requests: requestsResponse.data.data.result
    });
  } catch (error) {
    console.error('Failed to fetch Prometheus metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get logs from Loki
router.get('/logs', async (req, res) => {
  try {
    const lokiUrl = 'http://loki:3100';
    const query = '{job="containerlogs"}';
    const limit = req.query.limit || 100;
    
    const response = await axios.get(`${lokiUrl}/loki/api/v1/query_range`, {
      params: {
        query,
        limit,
        start: Date.now() - (5 * 60 * 1000) * 1000000, // 5 minutes ago in nanoseconds
        end: Date.now() * 1000000 // now in nanoseconds
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Failed to fetch Loki logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

export default router;
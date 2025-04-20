import app from "./app";
import config from "./config";

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Bull Board available at http://localhost:${PORT}/admin/queues`);
  console.log(`API available at http://localhost:${PORT}/api/jobs`);
  console.log(`POST to http://localhost:${PORT}/api/jobs to enqueue a new job`);
});

const Report = require('../models/Report');

exports.getReports = async (req, res) => {
  const reports = await Report.find();
  res.json(reports);
};

exports.createReport = async (req, res) => {
    const report = new Report(req.body);
  await report.save();
  res.status(201).json(report);
};

exports.getReport = async (req, res) => {
    const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).send('Report not found');
  res.json(report);
};

exports.updateReport = async (req, res) => {
    const report = await Report.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(report);
};

exports.deleteReport = async (req, res) => {
  await Report.findByIdAndDelete(req.params.id);
  res.status(204).send();
};

// Add to your reportController.js or a new analyticsController.js

exports.getReportAnalytics = async (req, res) => {
    // Example: Count reports by category
    const reportCounts = await Report.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.json(reportCounts);
};

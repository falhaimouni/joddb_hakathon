const { Notification } = require('../models');

exports.getMyNotifications = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = { recipient_id: req.employee.id };
    if (status) where.status = status;

    const notifications = await Notification.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ count: notifications.length, notifications });
  } catch (error) {
    next(error);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.count({ where: { recipient_id: req.employee.id, status: 'unread' } });
    res.status(200).json({ unread: count });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOne({ where: { notification_id: id, recipient_id: req.employee.id } });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    await notification.update({ status: 'read' });
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.update({ status: 'read' }, { where: { recipient_id: req.employee.id, status: 'unread' } });
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};



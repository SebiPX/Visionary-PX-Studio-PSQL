import pool from '../db';
import { v4 as uuidv4 } from 'uuid';

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface CreateNotificationDTO {
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  related_entity_id?: string;
  related_entity_type?: string;
}

/**
 * Creates a single notification for a specific user
 */
export async function createNotification(data: CreateNotificationDTO) {
  try {
    await pool.query(
      `INSERT INTO agency_notifications 
        (user_id, type, title, message, link, related_entity_id, related_entity_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.user_id,
        data.type,
        data.title,
        data.message || null,
        data.link || null,
        data.related_entity_id || null,
        data.related_entity_type || null,
      ]
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

/**
 * Creates notifications for an array of users
 */
export async function createNotificationsForUsers(userIds: string[], data: Omit<CreateNotificationDTO, 'user_id'>) {
  if (!userIds || userIds.length === 0) return;
  
  // Deduplicate userIds
  const uniqueUserIds = [...new Set(userIds)];
  
  for (const userId of uniqueUserIds) {
    await createNotification({ ...data, user_id: userId });
  }
}

/**
 * Notifies all members of a specific project (and optionally task assignees)
 * @param projectId The project ID
 * @param data Notification data
 * @param excludeUserId User ID to exclude (e.g., the person who made the change)
 */
export async function notifyProjectMembers(projectId: string, data: Omit<CreateNotificationDTO, 'user_id'>, excludeUserId?: string) {
  try {
    // Get all project members and task assignees for this project
    const result = await pool.query(
      `SELECT DISTINCT user_id FROM (
         SELECT user_id FROM agency_project_members WHERE project_id = $1
         UNION
         SELECT assignee_id as user_id FROM agency_tasks WHERE project_id = $1 AND assignee_id IS NOT NULL
         UNION
         SELECT unnest(assignee_ids) as user_id FROM agency_tasks WHERE project_id = $1 AND assignee_ids IS NOT NULL
       ) as users WHERE user_id IS NOT NULL`,
      [projectId]
    );
    
    let userIds = result.rows.map(row => row.user_id);
    if (excludeUserId) {
      userIds = userIds.filter(id => id !== excludeUserId);
    }
    
    await createNotificationsForUsers(userIds, data);
  } catch (error) {
    console.error('Error in notifyProjectMembers:', error);
  }
}

/**
 * Notifies specific assignees (e.g., for a new task)
 */
export async function notifyTaskAssignees(assigneeIds: string[], data: Omit<CreateNotificationDTO, 'user_id'>, excludeUserId?: string) {
  let userIds = assigneeIds;
  if (excludeUserId) {
    userIds = userIds.filter(id => id !== excludeUserId);
  }
  await createNotificationsForUsers(userIds, data);
}

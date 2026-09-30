-- Cover the full request/customer foreign key, including completed tasks.
create index samascan_task_request_contact on samascan_crm.tasks(inquiry_id,contact_id);

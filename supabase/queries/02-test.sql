

-- 2. 插入数据测试
INSERT INTO public.activities_encrypted (
    timestamp_id,
    user_id,
    title,
    location,
    class,
    status,
    last_modified
) VALUES (
    1730000000000,
    'a4278c44-89df-4c73-a259-52119e68f536',
    '测试活动',
    '测试地点',
    'T',
    'pending',
    now()
);

-- 3. 查询验证
SELECT * FROM public.activities_encrypted;

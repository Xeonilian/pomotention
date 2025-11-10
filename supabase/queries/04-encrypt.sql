-- 1. 确认 pgsodium 扩展版本
SELECT * FROM pg_extension WHERE extname = 'pgsodium';

-- 2. 测试加密函数是否可用
SELECT pgsodium.crypto_aead_det_keygen();

-- @block 3. 查看 pgsodium 所有可用函数
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'pgsodium' 
ORDER BY routine_name;

-- 4. 检查 pgsodium.key 表
SELECT * FROM pgsodium.key LIMIT 5;

-- 5. 查看 pgsodium.valid_key 表（这个是关键！）
SELECT * FROM pgsodium.valid_key LIMIT 5;

-- 查看 key 表有哪些字段
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'pgsodium' AND table_name = 'key'
ORDER BY ordinal_position;
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve (async (req) => {
    if (req.method === 'OPTIONS') {
      return new Response ('ok',{ headers: corsHeaders})
    }
    if (req.method !== 'GET') {
      return new Response ('Method not allowed', {status: 405, headers: corsHeaders })  
    }

    const url = new URL(req.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return new Response ('Missing id', { status: 400, headers: corsHeaders})
    }

    // Chỗ này bị lặp lại đúng lỗi mình note ở Lesson 5 lun anh: research_questions đang nằm lồng trong interviews, nhưng research question thực ra thuộc về research_plan (set 1 lần cho cả plan), không phải riêng cho từng interview. Research_questions với interviews nên đứng ngang hàng nhau nha anh, cả hai đều thuộc research_plan
    const { data, error} = await supabase
    .from('research-plan')
    .select(`
      id,
      interviews (
      id,
      content,
      research_questions (
        id,
        content
        )
      )
    `)
    .eq('id', id)

    if (error){
      return new Response (error.message, { status: 500,
        headers: corsHeaders })
    }
    // Query này không có `.single()` nên `data` luôn là mảng, kể cả không match row nào cũng ra `[]` chứ không phải `null` - mà `![]` trong JS là `false`, nên `if (!data)` dưới đây là dead code, y như bug `.single()` ở Example B, chỉ ngược chiều thôi.
    if (!data) {
      return new Response('Data not found', { status: 404, headers: corsHeaders })
    }
    return new Response(JSON.stringify (data),
    {status: 200,
    headers: {... corsHeaders, 'Content-Type': 'application/json'},
    })
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/research-plan' \
    --header 'apiKey: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' \
    --data '{"name":"Functions"}'

*/

/* 
1. The endpoint path and method
	1. Path: http://127.0.0.1:54321/functions/v1/research-plan?=3
	2. Method: GET
2. What the request body or URL params contain
	  id của research plan
3. What the server needs to do, step by step
	1. Gửi request OPTIONS, nếu database phản hồi OK (tức là có phản hồi từ phía database) -> chuyển sang bước 2
	2. Kiểm tra request method:
		1. nếu không phải là GET thì render error 405 Method not allowed
		2. nếu là GET thì sang bước 3
	3. Lấy URL endpoint path, sau đó lấy id của research plan từ Params
		1. nếu request id không được khai trong database thì render error 400 Missing id
		2. nếu request id có trong database, fetch research plan từ supabase
	4. lựa chọn id research plan, id và nội dung interviews, id và nội dung của research question nếu các id này trùng với id url get về từ bước 3
		1. nếu lỗi chung thì render error message 500
		2. nếu lỗi thiếu data thì render 404 Data not found
	5. return body (interview list) với interview được highlight đánh dấu complete
4. What it returns on success and on failure
	1.  Success: 
		1. status: 200, body (interview list) update highlight interview với status completed
	2. on failure
		1. status 500: lỗi chung
		2. status 400: gọi id chưa có trong database
		3. status 404: data không tìm thấy trong database

*/
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

    // [TBR] Anh ơi, đây lại đúng cái lỗi mình đã note ở Lesson 5 rồi nè: research_questions đang được nest bên trong interviews, nhưng theo đúng domain model thì research question thuộc về research_plan (đặt ra 1 lần cho cả plan), không phải riêng từng interview - y hệt feedback em từng ghi ở bài Database Design ("researchquestion đang reference interview, nhưng theo bài thì research question thuộc về research plan..."). Nên response đúng phải là research_questions nằm ngang hàng (sibling) với interviews, cả hai đều thuộc research_plan, chứ không lồng research_questions vào bên trong từng interview như vầy.
    // [TBR] Với lại theo Part 3 spec thì research_questions cần có interview_questions nest bên trong nữa (giống pattern Example B), nhưng ở đây research_questions chỉ mới select `id, content` thôi, chưa có interview_questions - thiếu 1 tầng nest theo yêu cầu bài.
    // [TBR] Nhỏ thôi: `.from('research-plan')` đang dùng dấu gạch ngang, Postgres identifier không cho phép gạch ngang nếu không quote - với lại theo naming convention (snake_case) mình từng nói ở Lesson 5 thì nên là `research_plan`/`research_plans` cho khớp.
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
    // [TBR] Vì query này không có `.single()`, `data` trả về sẽ là 1 mảng (array), kể cả khi không match được row nào thì cũng là `[]` chứ không phải `null`/`undefined` - mà `![]` luôn là `false` trong JS. Nên `if (!data)` ở đây cũng là dead code, không bao giờ trigger được, y như cái bug `.single()` mình vừa phân tích ở Example B, chỉ là ngược lại thôi (thiếu `.single()` thay vì có). Kết quả là truyền 1 id không tồn tại thì mình sẽ nhận về 200 với mảng rỗng, chứ không phải 404 như đang note.
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
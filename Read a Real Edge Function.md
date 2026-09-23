const corsHeaders = { // HTTP header controls whether a page on one origin can call another origin
  'Access-Control-Allow-Origin': '*', // allow request access all origin
  'Access-Control-Allow-Headers': 'authorization, content-type', //alow request access on specific type of headers
}
 
Deno.serve(async (req) => {           //request async
  if (req.method === 'OPTIONS') {     //send request OPTIONS, if database response ok, then proceed
    return new Response('ok', { headers: corsHeaders })
  }
 
  if (req.method !== 'PATCH') {       //if request method is not PATCH -> return headers '405 Method not allowed'
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }
 
  const url = new URL(req.url)       // declare url value
  const id = url.searchParams.get('id') // get id from URL request
 
  if (!id) {                        // if request unidentified id (input) -> return headers '400 Missing id'
    return new Response('Missing id', { status: 400, headers: corsHeaders })
  }
 
  const body = await req.json()     //wait for req.json() finished run, then read body data which was sent from supabase
 
  const { error } = await supabase //destructuring syntax, breakdown parameter array into many individual argument, and then based on what assigned argument to return variable
    .from('interviews')            //define the location of data request (from table interview)
    .update({ status: body.status }) //define the method (update the body status)
    .eq('id', id)                     //condition: only update body status that have id same as url id (line 15-16)
 
  if (error) {                      //if arugment is 'error' -> headers '500 error message'
    return new Response(error.message, { status: 500, headers: corsHeaders })
  }
 
  return new Response(JSON.stringify({ success: true }), { //if argument is not 'error' -> return headers '200 ....'
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

1. What method does it accept?
   PATCH
2. What does the request expect (params, body)?
   params: lấy 'id' từ URL  (sau khi searchParams)
   body:  object JSON - hiển thị response status theo reqquest
3. What does it return on success?
   status 200
   headers: {... corsHeaders, 'Content-Type': ' application/ json' },
4. What HTTP error would fire if a required input is missing?
   error message 400 - Missing id

> [TBR] Câu 4 này mới trả lời được nửa bài thôi á anh - "Missing id" đúng nhưng đó là cái bug lộ liễu, còn cái bug thật sự của Example A nằm ở chỗ khác: code không hề validate `body.status` trước khi update. Nếu client gửi lên body thiếu `status` (hoặc `body.status` là `undefined`), request vẫn đi tới `.update({ status: body.status })`, rồi Postgres/PostgREST reject cái update đó -> mình end up trả về lỗi 500 (generic error) thay vì 1 lỗi 400 sạch sẽ kiểu "Missing status". Đây mới là insight chính bài này muốn mình catch được đó anh.
> [TBR] Thêm 1 điểm nữa: tên bài là `PATCH /interviews/:id` - tức id nằm trên path - nhưng code thật lại đọc `url.searchParams.get('id')`, nghĩa là id đang được kỳ vọng nằm ở query string (`?id=...`). Cái title với cách implement đang lệch nhau, em nghĩ đáng để note ra vì đây chính là kiểu lỗi mình sẽ tự lặp lại ở phần thiết kế của mình (anh sẽ thấy ở dưới nha).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}
 
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
 
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }
 
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
 
  if (!id) {
    return new Response('Missing id', { status: 400, headers: corsHeaders })
  }
 
  const { data, error } = await supabase
    .from('research_questions')
    .select(`
      id,
      content,
      interview_questions (
        id,
        content
      )
    `)
    .eq('id', id)
    .single()
 
  if (error) {
    return new Response(error.message, { status: 500, headers: corsHeaders })
  }
 
  if (!data) {
    return new Response('Not found', { status: 404, headers: corsHeaders })
  }
 
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

1. What method does it accept?
   GET
2. What does the request expect (params, body)?
   params: lấy 'id' từ URL  (sau khi searchParams)
3. What does it return on success?
   status 200
   headers: {... corsHeaders, 'Content-Type': ' application/ json' },
4. What HTTP error would fire if a required input is missing?
   error message 400 - Missing id
   error message 404 - Missing data

> [TBR] Chỗ 404 này chưa đúng á anh - nhánh `if (!data) return 404` thật ra là dead code, không bao giờ chạy tới được đâu. Vì code có gọi `.single()`, mà `.single()` sẽ throw/trả error ngay khi query không match row nào (0 rows), nên flow sẽ nhảy thẳng vào nhánh `if (error)` ở trên và trả về 500 trước, chứ không đi xuống được dòng check `!data`. Nên thực tế truyền 1 id không tồn tại, endpoint này trả về 500 chứ không phải 404 như mình đang ghi đâu anh. Đây là đúng cái bẫy bài muốn mình phát hiện.